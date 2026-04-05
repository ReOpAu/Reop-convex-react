import { create } from "zustand";
import { devtools } from "zustand/middleware";
// import type { LocationIntent, Suggestion, HistoryItem } from '~/stores/types';

interface UIState {
	isRecording: boolean;
	isVoiceActive: boolean;
	isAgentSpeaking: boolean;
	isLoggingEnabled: boolean;
	agentRequestedManual: boolean;
	selectionAcknowledged: boolean;
	showingOptionsAfterConfirmation: boolean; // Toggle between confirmed result and options

	// VAD Configuration
	vadThresholds: {
		activationThreshold: number; // VAD score to activate voice
		deactivationThreshold: number; // VAD score to deactivate voice
		loggingThreshold: number; // VAD score to log activity
	};

	setIsRecording: (isRecording: boolean) => void;
	setIsVoiceActive: (isVoiceActive: boolean) => void;
	setIsAgentSpeaking: (isAgentSpeaking: boolean) => void;
	setIsLoggingEnabled: (enabled: boolean) => void;
	setAgentRequestedManual: (requested: boolean) => void;
	setSelectionAcknowledged: (ack: boolean) => void;
	setShowingOptionsAfterConfirmation: (showing: boolean) => void;
	setVadThresholds: (thresholds: Partial<UIState["vadThresholds"]>) => void;

	// Action to reset UI state
	resetUiState: () => void;
}

const initialUiState = {
	isRecording: false,
	isVoiceActive: false,
	isAgentSpeaking: false,
	isLoggingEnabled: true,
	agentRequestedManual: false,
	selectionAcknowledged: false,
	showingOptionsAfterConfirmation: false,
	vadThresholds: {
		activationThreshold: 0.5, // Previous hardcoded value
		deactivationThreshold: 0.3, // Previous hardcoded value
		loggingThreshold: 0.7, // Previous hardcoded value
	},
};

export const useUIStore = create<UIState>()(
	devtools(
		(set) => ({
			...initialUiState,
			setIsRecording: (recording: boolean) => set({ isRecording: recording }),
			setIsVoiceActive: (active: boolean) => set({ isVoiceActive: active }),
			setIsAgentSpeaking: (speaking: boolean) =>
				set({ isAgentSpeaking: speaking }),
			setIsLoggingEnabled: (enabled: boolean) =>
				set({ isLoggingEnabled: enabled }),
			setAgentRequestedManual: (requested: boolean) =>
				set({ agentRequestedManual: requested }),
			setSelectionAcknowledged: (ack: boolean) =>
				set({ selectionAcknowledged: ack }),
			setShowingOptionsAfterConfirmation: (showing: boolean) =>
				set({ showingOptionsAfterConfirmation: showing }),
			setVadThresholds: (thresholds: Partial<UIState["vadThresholds"]>) =>
				set((state) => ({
					vadThresholds: { ...state.vadThresholds, ...thresholds },
				})),
			resetUiState: () => set(initialUiState),
		}),
		{ name: "UIStore" },
	),
);
