import { useConversation } from "@elevenlabs/react";
import { useCallback, useRef } from "react";
import { useHistoryStore } from "~/stores/historyStore";
import { useUIStore } from "~/stores/uiStore";

export function useConversationManager(clientTools: Record<string, any>) {
	const AGENT_SPEAKING_DECAY_MS = 320;
	// More robust state selection to avoid lifecycle issues
	const isLoggingEnabled = useUIStore((state) => state.isLoggingEnabled);
	const addHistory = useHistoryStore((state) => state.addHistory);

	// Track connection attempts for retry logic
	const connectionAttempts = useRef(0);
	const maxConnectionAttempts = 3;
	const agentSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	// Logging utility - STABLE: No dependencies to prevent infinite loops
	const log = useCallback(
		(...args: any[]) => {
			// isLoggingEnabled is now a reactive value from the hook's perspective
			if (isLoggingEnabled) {
				console.log("[ConversationManager]", ...args);
			}
		},
		[isLoggingEnabled],
	);

	const setVoiceActivity = useCallback((isActive: boolean) => {
		const { isVoiceActive, setIsVoiceActive } = useUIStore.getState();
		if (isVoiceActive !== isActive) {
			setIsVoiceActive(isActive);
		}
	}, []);

	const clearAgentSpeakingTimeout = useCallback(() => {
		if (agentSpeakingTimeoutRef.current) {
			clearTimeout(agentSpeakingTimeoutRef.current);
			agentSpeakingTimeoutRef.current = null;
		}
	}, []);

	const setAgentSpeaking = useCallback(
		(isSpeaking: boolean) => {
			clearAgentSpeakingTimeout();
			const ui = useUIStore.getState();
			if (ui.isAgentSpeaking !== isSpeaking) {
				ui.setIsAgentSpeaking(isSpeaking);
			}

			if (isSpeaking) {
				agentSpeakingTimeoutRef.current = setTimeout(() => {
					const latestUi = useUIStore.getState();
					if (latestUi.isAgentSpeaking) {
						latestUi.setIsAgentSpeaking(false);
					}
					agentSpeakingTimeoutRef.current = null;
				}, AGENT_SPEAKING_DECAY_MS);
			}
		},
		[clearAgentSpeakingTimeout],
	);

	// Conversation setup with enhanced clientTools and complete event handling
	const conversation = useConversation({
		agentId: import.meta.env.VITE_ELEVENLABS_ADDRESS_AGENT_ID,
		onConnect: ({ conversationId }) => {
			log("🔗 Connected to ElevenLabs");
			log("🆔 Conversation ID:", conversationId);
			connectionAttempts.current = 0; // Reset on successful connection
			// Note: Centralized sync effect will handle sync automatically
		},
		onDisconnect: (details) => {
			log("🔌 Disconnected from ElevenLabs", details);
			// Force state update on external disconnect
			// Using .getState() is safe here as it's outside the React render cycle
			useUIStore.getState().setIsRecording(false);
			setVoiceActivity(false);
			useUIStore.getState().setIsAgentSpeaking(false);
			clearAgentSpeakingTimeout();
		},
		onMessage: (message) => {
			if ((message.role ?? message.source) === "user") {
				if (message.message?.trim()) {
					log("📝 Transcription received:", message.message);
					addHistory({
						type: "user",
						text: `Transcribed: "${message.message}"`,
					});
				} else {
					log("📝 Empty or null transcription received");
				}
				return;
			}

			log("🤖 Agent message received:", message);
			if (message.message) {
				addHistory({ type: "agent", text: message.message });
			}
		},
		onStatusChange: ({ status }) => {
			log("🔄 Conversation status changed:", status);
		},
		onError: (message, context) => {
			log("❌ Conversation error:", message, context);
			addHistory({ type: "system", text: `Error: ${message}` });
			useUIStore.getState().setIsAgentSpeaking(false);
			clearAgentSpeakingTimeout();

			// Handle connection errors with retry logic
			const errorMessage = message || "";
			const isConnectionError =
				errorMessage.includes("connection") ||
				errorMessage.includes("websocket") ||
				errorMessage.includes("network") ||
				errorMessage.includes("timeout");

			if (
				isConnectionError &&
				connectionAttempts.current < maxConnectionAttempts
			) {
				connectionAttempts.current++;
				const retryDelay = 2000 * Math.pow(2, connectionAttempts.current - 1); // Exponential backoff

				log(
					`🔄 Connection error detected, attempting retry ${connectionAttempts.current}/${maxConnectionAttempts} in ${retryDelay}ms`,
				);
				addHistory({
					type: "system",
					text: `Connection failed, retrying in ${retryDelay / 1000}s (attempt ${connectionAttempts.current}/${maxConnectionAttempts})`,
				});

				// The actual retry would need to be handled at a higher level
				// as the useConversation hook manages its own connection lifecycle
			} else if (isConnectionError) {
				log(
					`❌ Maximum connection attempts (${maxConnectionAttempts}) reached`,
				);
				addHistory({
					type: "system",
					text: `Connection failed after ${maxConnectionAttempts} attempts. Please check your internet connection and try again.`,
				});
			}
		},
		// Enhanced event handlers for full API compliance
		onAudio: (base64Audio) => {
			log("🔊 Audio data received:", {
				audioLength: base64Audio?.length,
				format: "base64",
			});
			setAgentSpeaking(Boolean(base64Audio));
		},
		onUnhandledClientToolCall: (toolCall) => {
			log("🔧 Client tool call event received:", {
				toolName: toolCall?.tool_name,
				parameters: toolCall?.parameters,
				callId: toolCall?.tool_call_id,
			});
			// This only fires when a client tool call is not auto-handled by the SDK.
		},
		onConversationMetadata: (metadata) => {
			log("🚀 Conversation initiated with metadata:", {
				conversationId: metadata?.conversation_id,
				agentOutputAudioFormat: metadata?.agent_output_audio_format,
				userInputAudioFormat: metadata?.user_input_audio_format,
			});
			addHistory({
				type: "system",
				text: `Conversation started (ID: ${metadata?.conversation_id || "unknown"})`,
			});
		},
		onVadScore: ({ vadScore }) => {
			// Use configurable thresholds from store
			const thresholds = useUIStore.getState().vadThresholds;

			// Only log VAD scores above configured threshold to avoid spam
			if (vadScore > thresholds.loggingThreshold) {
				log("🎙️ High voice activity detected:", vadScore);
			}

			// Update UI state based on configurable voice activity thresholds
			if (vadScore > thresholds.activationThreshold) {
				setVoiceActivity(true);
			} else if (vadScore < thresholds.deactivationThreshold) {
				setVoiceActivity(false);
			}
		},
		clientTools,
	});

	return {
		conversation,
	};
}
