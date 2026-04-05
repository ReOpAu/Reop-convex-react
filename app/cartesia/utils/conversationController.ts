import type { CartesiaConnectionStatus, CartesiaServerEvent } from "../types";

const KEEPALIVE_INTERVAL_MS = 60_000;
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY_MS = 1_000;
const ACK_TIMEOUT_MS = 10_000;
const WS_READY_STATE_OPEN = 1;

export interface CartesiaWebSocketLike {
	readyState: number;
	onopen: ((event: Event) => void) | null;
	onmessage: ((event: MessageEvent<string>) => void) | null;
	onerror: ((event: Event) => void) | null;
	onclose: ((event: CloseEvent) => void) | null;
	send(data: string): void;
	close(code?: number, reason?: string): void;
}

export interface CartesiaConversationControllerOptions {
	agentId: string;
	cartesiaVersion: string;
	getAuthToken: () => Promise<string | null>;
	onStatusChange: (status: CartesiaConnectionStatus) => void;
	onStreamIdChange: (streamId: string | null) => void;
	onMediaOutput?: (base64Data: string) => void;
	onClear?: () => void;
	createWebSocket?: (url: string) => CartesiaWebSocketLike;
	setTimeoutFn?: typeof setTimeout;
	clearTimeoutFn?: typeof clearTimeout;
	setIntervalFn?: typeof setInterval;
	clearIntervalFn?: typeof clearInterval;
	keepaliveIntervalMs?: number;
	maxReconnectAttempts?: number;
	baseReconnectDelayMs?: number;
	ackTimeoutMs?: number;
}

function bindTimer<T extends (...args: any[]) => any>(timer: T): T {
	return timer.bind(globalThis) as T;
}

export class CartesiaConversationController {
	private agentId: string;
	private readonly cartesiaVersion: string;
	private readonly getAuthToken: () => Promise<string | null>;
	private readonly onStatusChange: (status: CartesiaConnectionStatus) => void;
	private readonly onStreamIdChange: (streamId: string | null) => void;
	private readonly onMediaOutput?: (base64Data: string) => void;
	private readonly onClear?: () => void;
	private readonly createWebSocket: (url: string) => CartesiaWebSocketLike;
	private readonly setTimeoutFn: typeof setTimeout;
	private readonly clearTimeoutFn: typeof clearTimeout;
	private readonly setIntervalFn: typeof setInterval;
	private readonly clearIntervalFn: typeof clearInterval;
	private readonly keepaliveIntervalMs: number;
	private readonly maxReconnectAttempts: number;
	private readonly baseReconnectDelayMs: number;
	private readonly ackTimeoutMs: number;

	private ws: CartesiaWebSocketLike | null = null;
	private keepaliveTimeoutId: ReturnType<typeof setInterval> | null = null;
	private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private streamId: string | null = null;
	private status: CartesiaConnectionStatus = "disconnected";
	private reconnectAttempt = 0;
	private intentionalClose = false;
	private disposed = false;
	private lastAuthToken: string | null = null;
	private lastSessionId: string | null = null;
	private hasConnected = false;
	private connectionSerial = 0;
	private startRequestSerial = 0;

	constructor(options: CartesiaConversationControllerOptions) {
		this.agentId = options.agentId;
		this.cartesiaVersion = options.cartesiaVersion;
		this.getAuthToken = options.getAuthToken;
		this.onStatusChange = options.onStatusChange;
		this.onStreamIdChange = options.onStreamIdChange;
		this.onMediaOutput = options.onMediaOutput;
		this.onClear = options.onClear;
		this.createWebSocket =
			options.createWebSocket ?? ((url) => new WebSocket(url));
		this.setTimeoutFn = options.setTimeoutFn ?? bindTimer(globalThis.setTimeout);
		this.clearTimeoutFn =
			options.clearTimeoutFn ?? bindTimer(globalThis.clearTimeout);
		this.setIntervalFn =
			options.setIntervalFn ?? bindTimer(globalThis.setInterval);
		this.clearIntervalFn =
			options.clearIntervalFn ?? bindTimer(globalThis.clearInterval);
		this.keepaliveIntervalMs =
			options.keepaliveIntervalMs ?? KEEPALIVE_INTERVAL_MS;
		this.maxReconnectAttempts =
			options.maxReconnectAttempts ?? MAX_RECONNECT_ATTEMPTS;
		this.baseReconnectDelayMs =
			options.baseReconnectDelayMs ?? BASE_RECONNECT_DELAY_MS;
		this.ackTimeoutMs = options.ackTimeoutMs ?? ACK_TIMEOUT_MS;
	}

	setAgentId(agentId: string): void {
		this.agentId = agentId;
	}

	getStatus(): CartesiaConnectionStatus {
		return this.status;
	}

	getStreamId(): string | null {
		return this.streamId;
	}

	async startSession(nextSessionId?: string): Promise<void> {
		if (this.disposed) {
			throw new Error("Cartesia conversation controller has been disposed");
		}

		const sessionId = nextSessionId ?? this.lastSessionId;
		if (!sessionId) {
			this.setStatus("error");
			throw new Error("Cartesia session ID is required");
		}

		if (!this.agentId) {
			this.setStatus("error");
			throw new Error("Cartesia agent ID is required");
		}

		const requestSerial = ++this.startRequestSerial;
		this.lastSessionId = sessionId;
		this.reconnectAttempt = 0;
		this.cancelReconnect();
		this.closeSocket({ intentional: true, clearAuthToken: false });
		this.intentionalClose = false;
		this.hasConnected = false;

		let token: string | null;
		try {
			token = await this.getAuthToken();
		} catch (error) {
			this.lastAuthToken = null;
			this.setStatus("error");
			throw this.toError(error, "Failed to get Cartesia auth token");
		}

		if (requestSerial !== this.startRequestSerial || this.disposed) {
			throw new Error("Cartesia session start was superseded");
		}

		if (!token) {
			this.lastAuthToken = null;
			this.setStatus("error");
			throw new Error("Cartesia auth token request returned no token");
		}

		this.lastAuthToken = token;
		await this.connect(token, sessionId, {
			requestSerial,
			isReconnect: false,
		});
	}

	endSession(): void {
		this.startRequestSerial += 1;
		this.intentionalClose = true;
		this.hasConnected = false;
		this.cancelReconnect();
		this.clearKeepalive();
		this.lastAuthToken = null;
		this.lastSessionId = null;
		this.closeSocket({ intentional: true, clearAuthToken: false });
		this.setStreamId(null);
		this.setStatus("disconnected");
	}

	dispose(): void {
		this.disposed = true;
		this.endSession();
	}

	sendMediaInput(base64Data: string): boolean {
		if (
			!this.ws ||
			this.ws.readyState !== WS_READY_STATE_OPEN ||
			!this.streamId
		) {
			return false;
		}

		this.ws.send(
			JSON.stringify({
				event: "media_input",
				stream_id: this.streamId,
				media: {
					payload: base64Data,
				},
			}),
		);
		return true;
	}

	private async connect(
		token: string,
		sessionId: string,
		options: { requestSerial: number; isReconnect: boolean },
	): Promise<void> {
		const connectionSerial = ++this.connectionSerial;
		const ws = this.createWebSocket(
			this.buildUrl(token, this.agentId, this.cartesiaVersion),
		);

		this.ws = ws;
		this.setStreamId(null);
		this.setStatus("connecting");

		return new Promise<void>((resolve, reject) => {
			let waitingForAck = true;
			let startupError: Error | null = null;
			let ackTimeoutId: ReturnType<typeof setTimeout> | null = null;
			let settled = false;

			const clearAckTimeout = () => {
				if (ackTimeoutId) {
					this.clearTimeoutFn(ackTimeoutId);
					ackTimeoutId = null;
				}
			};

			const rejectOnce = (error: Error) => {
				if (settled) {
					return;
				}
				settled = true;
				clearAckTimeout();
				reject(error);
			};

			const resolveOnce = () => {
				if (settled) {
					return;
				}
				settled = true;
				clearAckTimeout();
				resolve();
			};

			ws.onopen = () => {
				if (!this.isActiveConnection(connectionSerial, options.requestSerial)) {
					ws.close();
					return;
				}

				try {
					ws.send(
						JSON.stringify({
							event: "start",
							config: {
								input_format: "pcm_44100",
							},
							metadata: {
								session_id: sessionId,
							},
						}),
					);
				} catch (error) {
					startupError = this.toError(error, "Failed to send Cartesia start event");
					this.setStatus("error");
					ws.close();
					return;
				}

				ackTimeoutId = this.setTimeoutFn(() => {
					startupError = new Error(
						"Timed out waiting for Cartesia session acknowledgment",
					);
					this.setStatus("error");
					ws.close();
				}, this.ackTimeoutMs);
			};

			ws.onmessage = (event) => {
				if (!this.isActiveConnection(connectionSerial, options.requestSerial)) {
					return;
				}

				let data: CartesiaServerEvent;
				try {
					data = JSON.parse(event.data);
				} catch {
					return;
				}

				switch (data.event) {
					case "ack":
						if (!data.stream_id) {
							startupError = new Error(
								"Cartesia acknowledgment did not include a stream_id",
							);
							this.setStatus("error");
							ws.close();
							return;
						}

						waitingForAck = false;
						this.hasConnected = true;
						this.reconnectAttempt = 0;
						this.setStreamId(data.stream_id);
						this.setStatus("connected");
						this.startKeepalive(ws);
						resolveOnce();
						return;

					case "media_output":
						this.onMediaOutput?.(data.media.payload);
						return;

					case "clear":
						this.onClear?.();
						return;
				}
			};

			ws.onerror = () => {
				startupError ??= new Error("Cartesia WebSocket error");
				if (waitingForAck || options.isReconnect) {
					this.setStatus("error");
				}
				if (waitingForAck && ws.readyState !== 3) {
					ws.close();
				}
			};

			ws.onclose = () => {
				clearAckTimeout();
				this.clearKeepalive();

				if (this.ws === ws) {
					this.ws = null;
				}

				if (this.streamId) {
					this.setStreamId(null);
				}

				if (!this.isActiveConnection(connectionSerial, options.requestSerial)) {
					return;
				}

				if (waitingForAck) {
					const error =
						startupError ??
						new Error("Cartesia socket closed before the session was ready");
					rejectOnce(error);
					if (
						options.isReconnect &&
						this.shouldReconnect({ waitingForAck: true })
					) {
						this.scheduleReconnect();
						return;
					}
					this.setStatus("error");
					return;
				}

				if (this.shouldReconnect({ waitingForAck: false })) {
					this.scheduleReconnect();
					return;
				}

				if (!this.intentionalClose) {
					this.setStatus("disconnected");
				} else {
					this.setStatus("disconnected");
				}
			};
		});
	}

	private shouldReconnect(options: { waitingForAck: boolean }): boolean {
		if (this.disposed || this.intentionalClose) {
			return false;
		}

		if (!this.lastAuthToken || !this.lastSessionId) {
			return false;
		}

		if (this.reconnectAttempt >= this.maxReconnectAttempts) {
			return false;
		}

		if (options.waitingForAck && !this.hasConnected) {
			return false;
		}

		return true;
	}

	private scheduleReconnect(): void {
		this.cancelReconnect();
		const delay = this.baseReconnectDelayMs * 2 ** this.reconnectAttempt;
		this.reconnectAttempt += 1;
		this.setStatus("connecting");
		const requestSerial = ++this.startRequestSerial;
		this.reconnectTimeoutId = this.setTimeoutFn(() => {
			this.reconnectTimeoutId = null;

			if (
				this.disposed ||
				this.intentionalClose ||
				!this.lastAuthToken ||
				!this.lastSessionId
			) {
				return;
			}

			void this.connect(this.lastAuthToken, this.lastSessionId, {
				requestSerial,
				isReconnect: true,
			}).catch(() => {});
		}, delay);
	}

	private cancelReconnect(): void {
		if (this.reconnectTimeoutId) {
			this.clearTimeoutFn(this.reconnectTimeoutId);
			this.reconnectTimeoutId = null;
		}
	}

	private startKeepalive(ws: CartesiaWebSocketLike): void {
		this.clearKeepalive();
		this.keepaliveTimeoutId = this.setIntervalFn(() => {
			if (ws.readyState === WS_READY_STATE_OPEN) {
				ws.send(JSON.stringify({ event: "ping" }));
			}
		}, this.keepaliveIntervalMs);
	}

	private clearKeepalive(): void {
		if (this.keepaliveTimeoutId) {
			this.clearIntervalFn(this.keepaliveTimeoutId);
			this.keepaliveTimeoutId = null;
		}
	}

	private closeSocket(options: {
		intentional: boolean;
		clearAuthToken: boolean;
	}): void {
		if (!this.ws) {
			return;
		}

		this.intentionalClose = options.intentional;
		if (options.clearAuthToken) {
			this.lastAuthToken = null;
		}
		const socket = this.ws;
		this.ws = null;
		socket.close();
	}

	private setStatus(status: CartesiaConnectionStatus): void {
		if (this.status === status) {
			return;
		}
		this.status = status;
		this.onStatusChange(status);
	}

	private setStreamId(streamId: string | null): void {
		if (this.streamId === streamId) {
			return;
		}
		this.streamId = streamId;
		this.onStreamIdChange(streamId);
	}

	private isActiveConnection(
		connectionSerial: number,
		requestSerial: number,
	): boolean {
		return (
			!this.disposed &&
			this.connectionSerial === connectionSerial &&
			this.startRequestSerial === requestSerial
		);
	}

	private buildUrl(token: string, agentId: string, cartesiaVersion: string): string {
		return `wss://api.cartesia.ai/agents/stream/${agentId}?cartesia_version=${cartesiaVersion}&access_token=${encodeURIComponent(token)}`;
	}

	private toError(error: unknown, fallbackMessage: string): Error {
		return error instanceof Error ? error : new Error(fallbackMessage);
	}
}
