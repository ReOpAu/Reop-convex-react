import { useCallback, useRef } from "react";
import { useApiStore } from "~/stores/apiStore";
import { useIntentStore } from "~/stores/intentStore";
import { useUIStore } from "~/stores/uiStore";

export function useAgentSync() {
	const lastSyncedSignatureRef = useRef<string | null>(null);

	const syncToAgent = useCallback(() => {
		try {
			const windowWithElevenLabs = window as typeof window & {
				setVariable?: (name: string, value: unknown) => void;
			};

			if (typeof windowWithElevenLabs.setVariable === "function") {
				// Get current state from individual stores (no dependencies to avoid loops)
				const ui = useUIStore.getState();
				const intent = useIntentStore.getState();
				const api = useApiStore.getState();

				const { suggestions, isLoading, error, source } = api.apiResults;
				const resolvedSource =
					source ?? (ui.isRecording ? "voice" : "manual");
				const semanticState = {
					ui: {
						isRecording: ui.isRecording,
						isVoiceActive: ui.isVoiceActive,
						agentRequestedManual: ui.agentRequestedManual,
						currentIntent: intent.currentIntent,
						searchQuery: intent.searchQuery,
						hasQuery: !!intent.searchQuery,
					},
					api: {
						suggestions,
						isLoading,
						error: error || null,
						hasResults: suggestions.length > 0,
						hasMultipleResults: suggestions.length > 1,
						resultCount: suggestions.length,
						source: resolvedSource,
					},
					selection: {
						selectedResult: intent.selectedResult,
						hasSelection: !!intent.selectedResult,
						selectedAddress: intent.selectedResult?.description || null,
						selectedPlaceId: intent.selectedResult?.placeId || null,
					},
					context: {
						agentLastSearchQuery: intent.agentLastSearchQuery,
						activeSearchSource: intent.activeSearchSource,
						selectionAcknowledged: ui.selectionAcknowledged,
					},
				};
				const semanticSignature = JSON.stringify(semanticState);

				if (lastSyncedSignatureRef.current === semanticSignature) {
					return;
				}

				// Create comprehensive agent state - use stable timestamp (rounded to nearest second)
				const timestamp = Math.floor(Date.now() / 1000) * 1000;
				const agentState = {
					// UI State
					ui: semanticState.ui,

					// API State (from Zustand - single source of truth)
					api: semanticState.api,

					// Selection State
					selection: semanticState.selection,

					// Meta
					meta: {
						lastUpdate: timestamp,
						sessionActive: ui.isRecording,
						agentRequestedManual: ui.agentRequestedManual,
						dataFlow: "API → React Query → Pillar Stores → ElevenLabs → Agent",
					},
				};

				// Sync to ElevenLabs variables
				windowWithElevenLabs.setVariable("agentState", agentState);

				// Individual variables for easy access
				windowWithElevenLabs.setVariable(
					"isRecording",
					agentState.ui.isRecording,
				);
				windowWithElevenLabs.setVariable(
					"hasResults",
					agentState.api.hasResults,
				);
				windowWithElevenLabs.setVariable(
					"selectedResult",
					agentState.selection.selectedAddress,
				);
				windowWithElevenLabs.setVariable(
					"suggestions",
					agentState.api.suggestions,
				);

				// Sync missing context variables referenced in the agent prompt
				windowWithElevenLabs.setVariable(
					"searchResultsCount",
					agentState.api.resultCount,
				);
				windowWithElevenLabs.setVariable(
					"agentLastSearchQuery",
					intent.agentLastSearchQuery,
				);
				windowWithElevenLabs.setVariable("currentIntent", intent.currentIntent);
				windowWithElevenLabs.setVariable(
					"activeSearchSource",
					intent.activeSearchSource,
				);
				windowWithElevenLabs.setVariable(
					"selectionAcknowledged",
					ui.selectionAcknowledged,
				);
				lastSyncedSignatureRef.current = semanticSignature;

				if (ui.isLoggingEnabled) {
					console.log("[AgentSync] State synchronized:", agentState);
				}
			}
		} catch (error) {
			console.warn("[AgentSync] Failed to sync state:", error);
		}
	}, []); // No dependencies needed since we use getState() directly

	return { syncToAgent };
}
