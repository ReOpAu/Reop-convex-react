import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAddressFinderClientTools } from "~/elevenlabs/hooks/useAddressFinderClientTools";
import { useConversationManager } from "~/elevenlabs/hooks/useConversationManager";
import type { VoiceVisualizerSource } from "~/components/address-finder/voice-visualizer/types";
import { useAudioManager } from "~/hooks/useAudioManager";
import type { Suggestion } from "~/stores/types";

interface UseConversationLifecycleProps {
	getSessionToken: () => string;
	clearSessionToken: () => void;
	handleSelectResult: (result: Suggestion) => Promise<unknown>;
}

/**
 * Custom hook for managing conversation and audio lifecycle
 * Handles conversation setup, audio management, and client tools integration
 */
export function useConversationLifecycle({
	getSessionToken,
	clearSessionToken,
	handleSelectResult,
}: UseConversationLifecycleProps) {
	// Audio and conversation management
	const clientTools = useAddressFinderClientTools(
		getSessionToken,
		clearSessionToken,
		handleSelectResult,
	);

	const { conversation } = useConversationManager(clientTools);

	// Store conversation reference for other hooks
	const conversationRef = useRef<
		ReturnType<typeof useConversationManager>["conversation"] | null
	>(null);

	useEffect(() => {
		conversationRef.current = conversation;
	}, [conversation]);

	const {
		startRecording,
		stopRecording,
		getInputByteFrequencyData,
		getInputLevel,
	} = useAudioManager();

	const voiceVisualizer = useMemo<VoiceVisualizerSource>(
		() => ({
			provider: "elevenlabs",
			supportsInputAnalyser: true,
			supportsOutputAnalyser: true,
			getInputByteFrequencyData,
			getOutputByteFrequencyData: conversation.getOutputByteFrequencyData,
			getInputLevel,
			getOutputLevel: conversation.getOutputVolume,
		}),
		[
			conversation.getOutputByteFrequencyData,
			conversation.getOutputVolume,
			getInputByteFrequencyData,
			getInputLevel,
		],
	);

	// Recording handlers
	const handleStartRecording = useCallback(() => {
		startRecording(conversation);
	}, [startRecording, conversation]);

	const handleStopRecording = useCallback(() => {
		stopRecording(conversation);
	}, [stopRecording, conversation]);

	// Request agent state handler
	const handleRequestAgentState = useCallback(() => {
		if (conversation.status === "connected") {
			const prompt =
				"Please report your current state. Use the getCurrentState tool to find out what it is, and then tell me the result.";
			conversation.sendUserMessage?.(prompt);
		}
	}, [conversation]);

	return {
		conversation,
		conversationRef,
		handleStartRecording,
		handleStopRecording,
		handleRequestAgentState,
		voiceVisualizer,
	};
}
