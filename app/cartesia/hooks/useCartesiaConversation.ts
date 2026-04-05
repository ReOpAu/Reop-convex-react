/**
 * Core WebSocket hook for the Cartesia Calls API.
 * Manages connection lifecycle, readiness gating, keepalive, and event routing.
 *
 * Protocol reference: https://docs.cartesia.ai/line/integrations/calls-api
 * - Events use "event" field (not "type")
 * - Media uses "media.payload" (not "data")
 * - The browser session is not ready until Cartesia returns an `ack` with a
 *   valid `stream_id`
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CARTESIA_API_VERSION } from "@shared/cartesia/constants";
import type { CartesiaConnectionStatus } from "../types";
import { CartesiaConversationController } from "../utils/conversationController";

interface UseCartesiaConversationOptions {
	agentId: string;
	sessionId: string | null;
	getAuthToken: () => Promise<string | null>;
	onMediaOutput?: (base64Data: string) => void;
	onClear?: () => void;
}

interface UseCartesiaConversationReturn {
	status: CartesiaConnectionStatus;
	streamId: string | null;
	startSession: (sessionId?: string) => Promise<void>;
	endSession: () => void;
	sendMediaInput: (base64Data: string) => boolean;
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

	const controllerRef = useRef<CartesiaConversationController | null>(null);
	const sessionIdRef = useRef(sessionId);
	const getAuthTokenRef = useRef(getAuthToken);
	const onMediaOutputRef = useRef(onMediaOutput);
	const onClearRef = useRef(onClear);

	useEffect(() => {
		sessionIdRef.current = sessionId;
	}, [sessionId]);

	useEffect(() => {
		getAuthTokenRef.current = getAuthToken;
	}, [getAuthToken]);

	useEffect(() => {
		onMediaOutputRef.current = onMediaOutput;
	}, [onMediaOutput]);

	useEffect(() => {
		onClearRef.current = onClear;
	}, [onClear]);

	if (!controllerRef.current) {
		controllerRef.current = new CartesiaConversationController({
			agentId,
			cartesiaVersion: CARTESIA_API_VERSION,
			getAuthToken: () => getAuthTokenRef.current(),
			onStatusChange: setStatus,
			onStreamIdChange: setStreamId,
			onMediaOutput: (base64Data) => onMediaOutputRef.current?.(base64Data),
			onClear: () => onClearRef.current?.(),
		});
	}

	useEffect(() => {
		controllerRef.current?.setAgentId(agentId);
	}, [agentId]);

	const startSession = useCallback(async (nextSessionId?: string) => {
		const targetSessionId = nextSessionId ?? sessionIdRef.current;
		await controllerRef.current?.startSession(targetSessionId ?? undefined);
	}, []);

	const endSession = useCallback(() => {
		controllerRef.current?.endSession();
	}, []);

	const sendMediaInput = useCallback((base64Data: string) => {
		return controllerRef.current?.sendMediaInput(base64Data) ?? false;
	}, []);

	useEffect(() => {
		return () => {
			controllerRef.current?.dispose();
			controllerRef.current = null;
		};
	}, []);

	return {
		status,
		streamId,
		startSession,
		endSession,
		sendMediaInput,
	};
}
