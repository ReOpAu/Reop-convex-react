/**
 * Core WebSocket hook for Cartesia Calls API.
 * Manages connection lifecycle, keepalive, and event routing.
 *
 * Protocol reference: https://docs.cartesia.ai/line/integrations/calls-api
 * - Events use "event" field (not "type")
 * - Media uses "media.payload" (not "data")
 * - Auth via query params (WebSocket API doesn't support custom headers)
 *
 * Auth strategy:
 *   1. Preferred: short-lived access token from Convex getAccessToken action
 *   2. Fallback: VITE_CARTESIA_API_KEY env var (local dev/POC only)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CartesiaConnectionStatus, CartesiaServerEvent } from "../types";

const CARTESIA_WS_BASE = "wss://api.cartesia.ai/agents/stream";
const CARTESIA_VERSION = "2025-04-16";
const KEEPALIVE_INTERVAL_MS = 60_000;
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY_MS = 1_000;

interface UseCartesiaConversationOptions {
	agentId: string;
	sessionId: string | null;
	/** Resolves an auth token/key. Called each time startSession is invoked. */
	getAuthToken: () => Promise<string | null>;
	onMediaOutput?: (base64Data: string) => void;
	onClear?: () => void;
}

interface UseCartesiaConversationReturn {
	status: CartesiaConnectionStatus;
	streamId: string | null;
	startSession: (sessionId?: string) => void;
	endSession: () => void;
	sendMediaInput: (base64Data: string) => void;
}

export function useCartesiaConversation({
	agentId,
	sessionId,
	getAuthToken,
	onMediaOutput,
	onClear,
}: UseCartesiaConversationOptions): UseCartesiaConversationReturn {
	const [status, setStatus] =
		useState<CartesiaConnectionStatus>("disconnected");
	const [streamId, setStreamId] = useState<string | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const reconnectAttemptRef = useRef(0);
	const intentionalCloseRef = useRef(false);
	const lastAuthTokenRef = useRef<string | null>(null);
	const sessionIdRef = useRef<string | null>(sessionId);

	// Store callbacks in refs to avoid stale closures
	const onMediaOutputRef = useRef(onMediaOutput);
	const onClearRef = useRef(onClear);
	const getAuthTokenRef = useRef(getAuthToken);

	useEffect(() => {
		onMediaOutputRef.current = onMediaOutput;
	}, [onMediaOutput]);
	useEffect(() => {
		onClearRef.current = onClear;
	}, [onClear]);
	useEffect(() => {
		getAuthTokenRef.current = getAuthToken;
	}, [getAuthToken]);
	useEffect(() => {
		sessionIdRef.current = sessionId;
	}, [sessionId]);

	const clearKeepalive = useCallback(() => {
		if (keepaliveRef.current) {
			clearInterval(keepaliveRef.current);
			keepaliveRef.current = null;
		}
	}, []);

	const startKeepalive = useCallback(
		(ws: WebSocket) => {
			clearKeepalive();
			keepaliveRef.current = setInterval(() => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({ event: "ping" }));
				}
			}, KEEPALIVE_INTERVAL_MS);
		},
		[clearKeepalive],
	);

	const handleMessage = useCallback((event: MessageEvent) => {
		try {
			const data: CartesiaServerEvent = JSON.parse(event.data);

			switch (data.event) {
				case "ack":
					if (data.stream_id) {
						setStreamId(data.stream_id);
					}
					break;
				case "media_output":
					onMediaOutputRef.current?.(data.media.payload);
					break;
				case "clear":
					onClearRef.current?.();
					break;
			}
		} catch {
			console.warn("[Cartesia] Failed to parse WebSocket message");
		}
	}, []);

	const connectWithToken = useCallback(
		(token: string) => {
			if (!agentId) {
				console.error("[Cartesia] Missing agentId");
				setStatus("error");
				return;
			}

			setStatus("connecting");
			intentionalCloseRef.current = false;

			// access_token= for minted tokens; api_key= is only for raw API keys
			const isAccessToken = !token.startsWith("sk_");
			const authParam = isAccessToken
				? `access_token=${token}`
				: `api_key=${token}`;
			const url = `${CARTESIA_WS_BASE}/${agentId}?cartesia_version=${CARTESIA_VERSION}&${authParam}`;
			const ws = new WebSocket(url);

			ws.onopen = () => {
				setStatus("connected");
				reconnectAttemptRef.current = 0;

				ws.send(
					JSON.stringify({
						event: "start",
						config: {
							input_format: "pcm_44100",
						},
						metadata: sessionIdRef.current
							? { session_id: sessionIdRef.current }
							: undefined,
					}),
				);

				startKeepalive(ws);
			};

			ws.onmessage = handleMessage;

			ws.onerror = () => {
				console.error("[Cartesia] WebSocket error");
				setStatus("error");
			};

			ws.onclose = () => {
				clearKeepalive();
				setStreamId(null);

				if (
					!intentionalCloseRef.current &&
					reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS &&
					lastAuthTokenRef.current
				) {
					const delay =
						BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttemptRef.current;
					reconnectAttemptRef.current += 1;
					console.log(
						`[Cartesia] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`,
					);
					setStatus("connecting");
					setTimeout(() => connectWithToken(lastAuthTokenRef.current!), delay);
				} else {
					setStatus("disconnected");
				}
			};

			wsRef.current = ws;
		},
		[agentId, handleMessage, startKeepalive, clearKeepalive],
	);

	const startSession = useCallback(async (nextSessionId?: string) => {
		reconnectAttemptRef.current = 0;
		const activeSessionId = nextSessionId ?? sessionIdRef.current;

		if (!activeSessionId) {
			console.error("[Cartesia] Missing sessionId");
			setStatus("error");
			return;
		}
		sessionIdRef.current = activeSessionId;

		const token = await getAuthTokenRef.current();
		if (!token) {
			console.error("[Cartesia] Failed to get auth token");
			setStatus("error");
			return;
		}

		lastAuthTokenRef.current = token;
		connectWithToken(token);
	}, [connectWithToken]);

	const endSession = useCallback(() => {
		intentionalCloseRef.current = true;
		clearKeepalive();
		lastAuthTokenRef.current = null;
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		setStatus("disconnected");
		setStreamId(null);
	}, [clearKeepalive]);

	const sendMediaInput = useCallback(
		(base64Data: string) => {
			if (wsRef.current?.readyState === WebSocket.OPEN) {
				wsRef.current.send(
					JSON.stringify({
						event: "media_input",
						stream_id: streamId,
						media: {
							payload: base64Data,
						},
					}),
				);
			}
		},
		[streamId],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			intentionalCloseRef.current = true;
			clearKeepalive();
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, [clearKeepalive]);

	return {
		status,
		streamId,
		startSession,
		endSession,
		sendMediaInput,
	};
}
