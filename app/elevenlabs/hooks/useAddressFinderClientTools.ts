import { useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import {
	classifyIntent,
	classifySelectedResult,
} from "~/utils/addressFinderUtils";
import { API_RETRY_CONFIG, withRetry } from "~/utils/retryMechanism";

// Constants for place details enrichment (shared with useActionHandler)
const ENRICHMENT_CACHE_KEY = "placeDetails";

// Type for place details
interface PlaceDetailsResult {
	placeId: string;
	formattedAddress: string;
	lat: number;
	lng: number;
	types: string[];
	postcode?: string;
	suburb?: string;
	state?: string;
}

import {
	getAgentByTransferIndex,
	getAvailableTransferTargets,
	validateTransferRequest,
} from "@shared/constants/agentConfig";
import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import { AddressSearchService } from "~/services/address-search";
import { useAddressSelectionStore } from "~/stores/addressSelectionStore";
import { useApiStore } from "~/stores/apiStore";
import { useHistoryStore } from "~/stores/historyStore";
import { useIntentStore } from "~/stores/intentStore";
import { useSearchHistoryStore } from "~/stores/searchHistoryStore";
import type { Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";
import type { ClientToolsImplementation } from "../../../ai/tools.config";

export function useAddressFinderClientTools(
	getSessionToken: () => string,
	clearSessionToken: () => void,
	onSelectResult?: (suggestion: Suggestion) => Promise<unknown>,
) {
	const queryClient = useQueryClient();
	const getPlaceSuggestionsAction = useAction(
		api.address.getPlaceSuggestions.getPlaceSuggestions,
	);
	const getPlaceDetailsAction = useAction(
		api.address.getPlaceDetails.getPlaceDetails,
	);

	// Cache-first function for place details to prevent duplicate API calls
	const getCachedOrFetchPlaceDetails = useCallback(
		async (placeId: string) => {
			// Check cache first
			const cached = queryClient.getQueryData([
				ENRICHMENT_CACHE_KEY,
				placeId,
			]) as
				| { success: true; details: PlaceDetailsResult }
				| { success: false; error: string }
				| undefined;
			if (cached?.success) {
				// Return cached result in the format expected by client tools
				return {
					success: true,
					result: cached,
				};
			}

			// Fetch from API with retry logic
			const result = await withRetry(
				() =>
					getPlaceDetailsAction({
						placeId,
					}),
				API_RETRY_CONFIG,
				`place details for "${placeId}"`,
			);

			// Cache the result if successful
			if (result.success && result.result?.success) {
				queryClient.setQueryData(
					[ENRICHMENT_CACHE_KEY, placeId],
					result.result,
				);
			}

			return result;
		},
		[queryClient, getPlaceDetailsAction],
	);

	// ✅ FIX: All required state values and setters are destructured at the top level.
	const { setAgentRequestedManual } = useUIStore();
	const {
		currentIntent,
		setActiveSearch,
		setSelectedResult,
		setCurrentIntent,
		setAgentLastSearchQuery,
	} = useIntentStore();
	const { addHistory } = useHistoryStore();
	const { clearSelectionAndSearch } = useAddressFinderActions();

	// Logging utility - STABLE: No dependencies to prevent infinite loops
	const log = useCallback((...args: unknown[]) => {
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[ClientTools]", ...args);
		}
	}, []); // Empty dependency array makes this completely stable

	// Enhanced ClientTools for managing place suggestions directly
	const clientTools = useMemo(
		() => ({
			searchAddress: async (params: { query: string }) => {
				log("🔧 Tool Call: searchAddress with params:", params);

				// STATE RESET: Per documentation, a new search must clear any existing selection.
				setSelectedResult(null);
				useUIStore.getState().setSelectionAcknowledged(false);

				const { query } = params;

				if (typeof query !== "string" || !query.trim()) {
					const errorMessage =
						"Invalid or missing 'query' parameter for searchAddress tool.";
					log(`Tool searchAddress failed: ${errorMessage}`, { params });
					return JSON.stringify({
						status: "error",
						error: errorMessage,
					});
				}

				addHistory({ type: "agent", text: `Searching for: "${query}"` });

				try {
					const intent = classifyIntent(query);
					// Set intent AFTER classification so frontend and backend agree
					setCurrentIntent(intent);
					log(
						`🔧 Agent search for "${query}" classified with intent: "${intent}"`,
					);

					if (intent === "address") {
						log(
							`🔬 Intent is "address", using validateThenEnrichAddress flow for agent.`,
						);

						// Run both calls in parallel — they are independent
						const [multipleResultsCall, validationResult] = await Promise.all([
							// Get multiple suggestions to preserve options for "show options again"
							withRetry(
								() =>
									getPlaceSuggestionsAction({
										query,
										intent: "general", // Use general to get multiple options
										isAutocomplete: true,
										sessionToken: getSessionToken(),
									}),
								API_RETRY_CONFIG,
								`multiple suggestions for "${query}"`,
							),
							// Validate the top result for address intent
							withRetry(
								() =>
									getPlaceSuggestionsAction({
										query,
										intent: "address",
										maxResults: 1,
										isAutocomplete: false,
									}),
								API_RETRY_CONFIG,
								`address validation for "${query}"`,
							),
						]);

						if (!validationResult.success) {
							log(
								"❌ Address validation failed after retries:",
								validationResult.error,
							);
							return JSON.stringify({
								status: "validation_failed",
								suggestions: [],
								error: `Validation failed after ${validationResult.attempts} attempts: ${validationResult.error?.message || "Unknown error"}`,
							});
						}

						const validation = validationResult.result;
						if (!validation) {
							log("❌ Validation result is null");
							return JSON.stringify({
								status: "validation_failed",
								suggestions: [],
								error: "Validation result is null",
							});
						}

						if (validation.success && validation.suggestions.length > 0) {
							const suggestion = validation.suggestions[0];
							log(
								`✅ Agent search validated successfully: "${suggestion.description}"`,
							);
							const validatedSuggestion: Suggestion = {
								placeId: suggestion.placeId,
								description: suggestion.description,
								types: suggestion.types || [
									"street_address",
									"validated_address",
								],
								resultType: suggestion.resultType || "address",
								confidence: suggestion.confidence || 0.95,
								suburb: suggestion.suburb,
								structuredFormatting: suggestion.structuredFormatting,
							};

							// Store all suggestions in cache to preserve options for "show options again"
							const allSuggestions =
								multipleResultsCall.success &&
								multipleResultsCall.result?.success &&
								multipleResultsCall.result.suggestions
									? multipleResultsCall.result.suggestions
									: [validatedSuggestion];

							queryClient.setQueryData(
								["addressSearch", query],
								allSuggestions,
							);
							setAgentLastSearchQuery(query);
							setActiveSearch({ query, source: "voice" });

							log(
								`🔧 Stored ${allSuggestions.length} suggestions in cache for potential "show options again"`,
							);

							return JSON.stringify({
								status: "validated",
								count: 1,
								message: "On screen now.",
								note: "Say 'Take a look' or 'On screen now'. Nothing else. Do not read the address aloud or narrate what happened.",
							});
						}
						// Strict validation found no results — fall back to loose
						// results from the general/autocomplete call if available.
						const looseResults =
							multipleResultsCall.success &&
							multipleResultsCall.result?.success &&
							multipleResultsCall.result.suggestions?.length > 0
								? multipleResultsCall.result.suggestions
								: null;

						if (looseResults) {
							log(
								`⚠️ Strict validation failed but loose call returned ${looseResults.length} results — falling back`,
							);
							queryClient.setQueryData(["addressSearch", query], looseResults);
							setAgentLastSearchQuery(query);
							setActiveSearch({ query, source: "voice" });

							return JSON.stringify({
								status: "suggestions_available",
								count: looseResults.length,
								message: "On screen now.",
								note: "Say 'Take a look' or 'On screen now'. Nothing else. Never narrate what you did.",
							});
						}

						const errorMessage = validation.success
							? "No suggestions found"
							: validation.error;
						log(`❌ Agent search failed validation: ${errorMessage}`);
						addHistory({
							type: "agent",
							text: `Agent search failed validation: ${errorMessage}`,
						});
						return JSON.stringify({
							status: "validation_failed",
							suggestions: [],
							error:
								errorMessage || "The provided address could not be validated.",
						});
					}

					// Wrap API call with retry logic
					const searchResult = await withRetry(
						() =>
							getPlaceSuggestionsAction({
								query: query,
								intent: intent || "general",
								isAutocomplete: true,
								sessionToken: getSessionToken(),
							}),
						API_RETRY_CONFIG,
						`place suggestions for "${query}"`,
					);

					if (!searchResult.success) {
						log(
							"❌ Place suggestions search failed after retries:",
							searchResult.error,
						);
						setAgentLastSearchQuery(null);
						return JSON.stringify({
							status: "error",
							error: `Search failed after ${searchResult.attempts} attempts: ${searchResult.error?.message || "Unknown error"}`,
						});
					}

					const result = searchResult.result;
					if (!result) {
						log("❌ Search result is null");
						setAgentLastSearchQuery(null);
						return JSON.stringify({
							status: "error",
							error: "Search result is null",
						});
					}

					if (result.success && result.suggestions) {
						log(
							`🔧 Search successful, populating cache for query: "${query}" with ${result.suggestions.length} suggestions.`,
						);

						// Manually update the React Query cache - The Single Source of Truth for API State
						queryClient.setQueryData(
							["addressSearch", query],
							result.suggestions,
						);

						// Set the agent context in Zustand - The "Brain's" memory of the last agent action
						setAgentLastSearchQuery(query);

						// Update the main search query in the "Brain" to make the UI display these results.
						setActiveSearch({ query, source: "voice" });

						// Return summary to agent (DO NOT return full suggestions to prevent reading aloud)
						return JSON.stringify({
							status: "suggestions_available",
							count: result.suggestions.length,
							message: "On screen now.",
							note: "Say 'Take a look' or 'On screen now'. Nothing else. Never narrate what you did.",
						});
					}

					log("🔧 Search returned no results or failed.");
					setAgentLastSearchQuery(null); // Clear context
					return JSON.stringify([]); // Return an empty array on failure or no results.
				} catch (error) {
					log("Tool searchAddress failed:", error);
					setAgentLastSearchQuery(null); // Clear context on failure
					return JSON.stringify({
						status: "error",
						error: error instanceof Error ? error.message : "Search failed",
					});
				}
			},

			getSuggestions: async () => {
				log("🔧 Tool Call: getSuggestions");
				// ✅ CORRECT: Use `getState()` for access inside callbacks to ensure freshness.
				const { isRecording: isRecordingFromState } = useUIStore.getState();
				const currentSearchQuery = useIntentStore.getState().searchQuery;
				const suggestions =
					queryClient.getQueryData<Suggestion[]>([
						"addressSearch",
						currentSearchQuery,
					]) || [];

				log("🔧 getSuggestions returning (unified source):", {
					totalSuggestions: suggestions.length,
					unified: suggestions.length,
					isRecording: isRecordingFromState,
					source: suggestions.length > 0 ? "unified" : "none",
					note: "Using unified React Query source for all suggestions",
				});

				return JSON.stringify({
					count: suggestions.length,
					source: suggestions.length > 0 ? "unified" : "none",
					mode: isRecordingFromState ? "conversation" : "manual",
					message:
						suggestions.length === 0
							? "No suggestions available."
							: "On screen now.",
					note: "Say 'Take a look' or 'On screen now'. Nothing else. Never narrate what you did.",
				});
			},

			selectSuggestion: async (params: unknown) => {
				log("🔧 ===== Tool Call: selectSuggestion =====");
				log("🔧 AGENT ATTEMPTING SELECTION with params:", params);

				let placeId: string | undefined;
				if (typeof params === "string") {
					placeId = params;
				} else if (params && typeof params === "object") {
					const paramObj = params as Record<string, unknown>;
					placeId = (paramObj.placeId || paramObj.place_id) as
						| string
						| undefined;
				}
				if (typeof placeId !== "string" || !placeId.trim()) {
					const errorMessage =
						"Invalid or missing 'placeId' or 'place_id' parameter for selectSuggestion tool.";
					log(`Tool selectSuggestion failed: ${errorMessage}`, { params });
					return JSON.stringify({ status: "error", error: errorMessage });
				}

				const { agentLastSearchQuery: agentLastSearchQueryFromState } =
					useIntentStore.getState();

				let selection: Suggestion | undefined = undefined;
				if (agentLastSearchQueryFromState) {
					const suggestionsFromAgentSearch = queryClient.getQueryData<
						Suggestion[]
					>(["addressSearch", agentLastSearchQueryFromState]);
					if (suggestionsFromAgentSearch) {
						selection = suggestionsFromAgentSearch.find(
							(s) => s.placeId === placeId,
						);
					}
				}

				if (selection) {
					let updatedSelection = selection;
					if (
						(selection.lat === undefined || selection.lng === undefined) &&
						selection.placeId
					) {
						// Use cache-first function to prevent duplicate API calls
						const detailsResult = await getCachedOrFetchPlaceDetails(
							selection.placeId,
						);

						if (
							detailsResult.success &&
							detailsResult.result?.success &&
							detailsResult.result.details
						) {
							updatedSelection = {
								...selection,
								lat: detailsResult.result.details.lat,
								lng: detailsResult.result.details.lng,
							};
						} else {
							const errorMessage = (() => {
								if ("error" in detailsResult && detailsResult.error)
									return detailsResult.error;
								if (
									"result" in detailsResult &&
									detailsResult.result &&
									"error" in detailsResult.result
								) {
									return (detailsResult.result as { error: string }).error;
								}
								return "Unknown error";
							})();
							log(
								"⚠️ Place details retrieval failed after retries:",
								errorMessage,
							);
							// Continue with selection even if details fail
						}
					}
					if (onSelectResult) {
						await onSelectResult(updatedSelection);
						return JSON.stringify({
							status: "confirmed",
							timestamp: Date.now(),
							message: "Done.",
							note: "IMPORTANT: Do NOT read the address aloud. It is visible on screen. Say 'got it', 'done', or ask what's next.",
						});
					}
					// fallback: legacy direct state update (should not be used)
					const intent = classifySelectedResult(updatedSelection);
					setCurrentIntent(intent);
					setSelectedResult(updatedSelection);
					setActiveSearch({
						query: updatedSelection.description,
						source: "voice",
					});
					addHistory({
						type: "agent",
						text: `Agent selected: "${updatedSelection.description}" (${intent})`,
					});
					clearSessionToken();
					setAgentLastSearchQuery(null);
					return JSON.stringify({
						status: "confirmed",
						intent,
						timestamp: Date.now(),
						message: "Done.",
						note: "IMPORTANT: Do NOT read the address aloud. It is visible on screen. Say 'got it', 'done', or ask what's next.",
					});
				}

				log("❌ Selection not found for placeId:", placeId);
				const agentLastSearchQueryFromStateForError =
					useIntentStore.getState().agentLastSearchQuery;
				const suggestionsFromAgentSearch = agentLastSearchQueryFromStateForError
					? queryClient.getQueryData<Suggestion[]>([
							"addressSearch",
							agentLastSearchQueryFromStateForError,
						])
					: [];
				log(
					"Available suggestions in agent context:",
					(suggestionsFromAgentSearch || []).map((s) => ({
						placeId: s.placeId,
						description: s.description,
					})),
				);

				// --- DEFENSIVE SYNC: If suggestions are empty but selectedResult matches, confirm selection ---
				// See UNIFIED_ADDRESS_SYSTEM.md and state-management-strategy.md for rationale.
				const currentSelection = useIntentStore.getState().selectedResult;
				if (currentSelection && currentSelection.placeId === placeId) {
					log(
						"✅ Defensive: Confirming selection from selectedResult, not suggestions array.",
					);
					const intent = useIntentStore.getState().currentIntent;
					return JSON.stringify({
						status: "confirmed",
						intent,
						timestamp: Date.now(),
						message: "Done.",
						note: "IMPORTANT: Do NOT read the address aloud. It is visible on screen.",
					});
				}

				return JSON.stringify({
					status: "not_found",
					searchedPlaceId: placeId,
					error:
						"The requested placeId could not be found in the last set of agent search results. The user may need to search again.",
				});
			},

			getCurrentState: async () => {
				log("🔧 ===== Tool Call: getCurrentState =====");
				// ✅ CORRECT: Use `getState()` for access inside callbacks.
				const { isRecording, isVoiceActive } = useUIStore.getState();
				const { currentIntent, searchQuery, selectedResult } =
					useIntentStore.getState();
				const { apiResults } = useApiStore.getState();

				let systemStatus:
					| "AWAITING_USER_INPUT"
					| "AWAITING_USER_SELECTION"
					| "SELECTION_CONFIRMED";
				let systemStatusDescription: string;

				if (selectedResult) {
					systemStatus = "SELECTION_CONFIRMED";
					systemStatusDescription = `A final address has been selected: "${selectedResult.description}". The agent should now confirm this with the user or ask for next steps.`;
				} else if (
					apiResults.suggestions &&
					apiResults.suggestions.length > 0
				) {
					systemStatus = "AWAITING_USER_SELECTION";
					systemStatusDescription = `Multiple address suggestions are available. The agent should help the user choose from the list of ${apiResults.suggestions.length} options.`;
				} else {
					systemStatus = "AWAITING_USER_INPUT";
					systemStatusDescription = `The system is idle and waiting for the user to provide an address to search for. The agent's primary goal is to ask the user for a search query.`;
				}

				const stateSummary = {
					systemStatus: {
						status: systemStatus,
						description: systemStatusDescription,
					},
					ui: {
						isRecording,
						isVoiceActive,
						currentIntent: currentIntent || "general",
						searchQuery,
						hasQuery: !!searchQuery,
					},
					api: {
						suggestionsCount: apiResults.suggestions.length,
						isLoading: apiResults.isLoading,
						error: apiResults.error,
						hasResults: apiResults.suggestions.length > 0,
					},
					selection: {
						selectedResult,
						hasSelection: !!selectedResult,
						selectedAddress: selectedResult?.description || null,
						selectedPlaceId: selectedResult?.placeId || null,
					},
				};

				log("🔧 getCurrentState returning summary:", stateSummary);
				return JSON.stringify(stateSummary);
			},

			getConfirmedSelection: async () => {
				log("🔧 Tool Call: getConfirmedSelection");
				const { selectedResult: confirmedResult } = useIntentStore.getState();
				const hasSelection = !!confirmedResult;

				const { currentIntent, searchQuery } = useIntentStore.getState();
				const { isRecording: isRecordingFromStore } = useUIStore.getState();

				log("🔧 Current state snapshot (fresh from store):", {
					hasSelection,
					selectedResultExists: !!confirmedResult,
					selectedDescription: confirmedResult?.description,
					selectedPlaceId: confirmedResult?.placeId,
					currentIntent,
					searchQuery,
					isRecording: isRecordingFromStore,
					storeState: {
						selectedResult:
							useIntentStore.getState().selectedResult?.description,
						currentIntent: useIntentStore.getState().currentIntent,
						searchQuery: useIntentStore.getState().searchQuery,
					},
				});

				const response = {
					hasSelection,
					selection: confirmedResult,
					intent: currentIntent,
					searchQuery: searchQuery,
				};

				if (hasSelection) {
					log("✅ CONFIRMED SELECTION AVAILABLE:", {
						description: confirmedResult?.description,
						placeId: confirmedResult?.placeId,
						intent: currentIntent,
					});
				} else {
					log("⚠️ No confirmed selection available.");
				}
				return JSON.stringify(response);
			},

			clearSelection: async () => {
				log("🔧 Tool Call: clearSelection");
				// Directly call the centralized action
				clearSelectionAndSearch();
				useUIStore.getState().setSelectionAcknowledged(false);
				log("✅ Selection and search cleared via centralized action.");
				return JSON.stringify({ status: "cleared" });
			},

			confirmUserSelection: async (params: unknown) => {
				log("🔧 ===== Tool Call: confirmUserSelection =====");
				log("🔧 AGENT ACKNOWLEDGING USER SELECTION with params:", params);

				// This tool allows the agent to explicitly acknowledge a user's selection
				const { selectedResult: currentSelection } = useIntentStore.getState();
				log("🔧 Current selection state:", {
					hasSelection: !!currentSelection,
					description: currentSelection?.description,
					placeId: currentSelection?.placeId,
					intent: currentIntent,
				});

				if (currentSelection) {
					const response = {
						status: "acknowledged",
						intent: currentIntent,
						message: "Got it.",
						note: "IMPORTANT: Do NOT read the address back. The user can see it on screen. Just say 'got it' and ask what's next.",
						timestamp: Date.now(),
					};

					log("✅ ACKNOWLEDGING USER SELECTION:", currentSelection.description);
					addHistory({
						type: "agent",
						text: `✅ Confirmed: "${currentSelection.description}" (${currentIntent})`,
					});

					// Note: Centralized sync effect will handle sync automatically

					return JSON.stringify(response);
				}
				log("❌ NO SELECTION TO ACKNOWLEDGE");
				return JSON.stringify({
					status: "no_selection",
					message:
						"I don't see any current selection to acknowledge. Please make a selection first.",
				});
			},

			requestManualInput: async (params: { reason: string }) => {
				log("🔧 ===== Tool Call: requestManualInput =====");
				const reason =
					params?.reason ||
					"The agent has determined manual input may be more effective.";

				// Keep conversation active. Only set UI flags.
				setAgentRequestedManual(true);
				addHistory({ type: "agent", text: `🤖 → 📝 ${reason}` });

				// ✅ CORRECT: Get fresh state inside the tool function.
				const { isRecording: isRecordingFromState } = useUIStore.getState();

				return JSON.stringify({
					status: "hybrid_mode_activated",
					message: "Manual input has been enabled.",
					isRecording: isRecordingFromState,
				});
			},

			getHistory: async () => {
				log("🔧 Tool Call: getHistory");
				const { history: recordedHistory } = useHistoryStore.getState();
				log("🔧 Returning interaction history. Count:", recordedHistory.length);
				return JSON.stringify(recordedHistory);
			},

			getPreviousSearches: async () => {
				log("🔧 Tool Call: getPreviousSearches (agent-side recall)");
				// TODO: Integrate with Convex client or expose previous searches via Convex for agent-side recall.
				// For now, return an empty array (session memory is in Zustand, not accessible to agent).
				return JSON.stringify([]);
			},

			selectByOrdinal: async (params: { ordinal: string }) => {
				log("🔧 Tool Call: selectByOrdinal with params:", params);

				const { ordinal } = params;
				if (typeof ordinal !== "string" || !ordinal.trim()) {
					const errorMessage =
						"Invalid or missing 'ordinal' parameter for selectByOrdinal tool.";
					log(`Tool selectByOrdinal failed: ${errorMessage}`, { params });
					return JSON.stringify({
						status: "error",
						error: errorMessage,
					});
				}

				// Get current search context
				const { agentLastSearchQuery } = useIntentStore.getState();
				if (!agentLastSearchQuery) {
					log("❌ No agent search context for ordinal selection");
					return JSON.stringify({
						status: "error",
						error:
							"No search context available. Please search for addresses first.",
					});
				}

				// Get current suggestions
				const suggestions =
					queryClient.getQueryData<Suggestion[]>([
						"addressSearch",
						agentLastSearchQuery,
					]) || [];

				if (suggestions.length === 0) {
					log("❌ No suggestions available for ordinal selection");
					return JSON.stringify({
						status: "error",
						error:
							"No suggestions available. Please search for addresses first.",
					});
				}

				// Parse ordinal to index
				let index = -1;
				const lowerOrdinal = ordinal.toLowerCase().trim();

				// Handle numbered ordinals (1, 2, 3, etc.)
				if (/^\d+$/.test(lowerOrdinal)) {
					index = Number.parseInt(lowerOrdinal, 10) - 1; // Convert to 0-based index
				}
				// Handle word ordinals
				else if (
					lowerOrdinal === "first" ||
					lowerOrdinal === "1st" ||
					lowerOrdinal === "one"
				) {
					index = 0;
				} else if (
					lowerOrdinal === "second" ||
					lowerOrdinal === "2nd" ||
					lowerOrdinal === "two"
				) {
					index = 1;
				} else if (
					lowerOrdinal === "third" ||
					lowerOrdinal === "3rd" ||
					lowerOrdinal === "three"
				) {
					index = 2;
				} else if (
					lowerOrdinal === "fourth" ||
					lowerOrdinal === "4th" ||
					lowerOrdinal === "four"
				) {
					index = 3;
				} else if (
					lowerOrdinal === "fifth" ||
					lowerOrdinal === "5th" ||
					lowerOrdinal === "five"
				) {
					index = 4;
				} else {
					log(`❌ Unrecognized ordinal: ${ordinal}`);
					return JSON.stringify({
						status: "error",
						error: `Unrecognized ordinal "${ordinal}". Please use "first", "second", "third", or numbers like "1", "2", "3".`,
					});
				}

				// Validate index range
				if (index < 0 || index >= suggestions.length) {
					log(
						`❌ Ordinal index ${index + 1} out of range for ${suggestions.length} suggestions`,
					);
					return JSON.stringify({
						status: "error",
						error: `Selection "${ordinal}" is out of range. Only ${suggestions.length} suggestions are available.`,
					});
				}

				// Get the selected suggestion
				const selectedSuggestion = suggestions[index];
				log(
					`✅ Ordinal "${ordinal}" maps to suggestion:`,
					selectedSuggestion.description,
				);

				// Use selectSuggestion logic to perform the actual selection
				return await clientTools.selectSuggestion({
					placeId: selectedSuggestion.placeId,
				});
			},

			setSelectionAcknowledged: async (params: { acknowledged: boolean }) => {
				useUIStore.getState().setSelectionAcknowledged(params.acknowledged);
				return JSON.stringify({ status: "ok" });
			},

			showOptionsAgain: async () => {
				log("Tool Call: showOptionsAgain");

				// Use atomic getOrInitialize to prevent race conditions
				const service = AddressSearchService.getOrInitialize(queryClient, {
					intentStore: useIntentStore,
					uiStore: useUIStore,
					apiStore: useApiStore,
					searchHistoryStore: useSearchHistoryStore,
					addressSelectionStore: useAddressSelectionStore,
				});
				const result = service.showOptionsAgain();

				if (!result.success) {
					const errorMessage =
						result.error?.toUserMessage() ?? "Could not show options";
					log(`showOptionsAgain failed: ${errorMessage}`);
					return JSON.stringify({
						status: "error",
						error: errorMessage,
					});
				}

				const optionsCount = result.options?.length ?? 0;
				const currentSelection = service.getCurrentSelection();

				log(`Showing ${optionsCount} previous options again`);
				addHistory({
					type: "agent",
					text: `Showing ${optionsCount} previous address options again`,
				});

				return JSON.stringify({
					status: "options_displayed",
					message: "On screen now.",
					note: "Say 'Take a look' or 'On screen now'. Nothing else. Never narrate what you did.",
					optionsCount,
				});
			},

			transferToAgent: async (params: {
				agent_number: number;
				reason?: string;
				transfer_message?: string;
				delay?: number;
			}) => {
				log("🔧 ===== Tool Call: transferToAgent =====");
				log("🔄 AGENT REQUESTING TRANSFER with params:", params);

				const { agent_number, reason, transfer_message, delay } = params;

				// Validate agent_number
				if (typeof agent_number !== "number" || agent_number < 0) {
					const errorMessage =
						"Invalid agent_number. Must be a non-negative number.";
					log(`Tool transferToAgent failed: ${errorMessage}`, { params });
					return JSON.stringify({
						status: "error",
						error: errorMessage,
					});
				}

				// Use enhanced validation for transfer request
				const validation = validateTransferRequest(
					"ADDRESS_FINDER",
					agent_number,
				);
				if (!validation.valid) {
					const availableAgents = getAvailableTransferTargets("ADDRESS_FINDER");
					log(`Tool transferToAgent failed: ${validation.error}`, { params });
					return JSON.stringify({
						status: "error",
						error: validation.error,
						availableAgents: availableAgents,
					});
				}

				const targetAgent = validation.targetAgent;
				if (!targetAgent) {
					const errorMessage =
						"Target agent is undefined despite valid validation";
					log(`Tool transferToAgent failed: ${errorMessage}`, { params });
					return JSON.stringify({
						status: "error",
						error: errorMessage,
					});
				}

				log(
					`✅ Target agent found: ${targetAgent.name} (${targetAgent.description})`,
				);

				// Log transfer request for user history
				const transferReason =
					reason ||
					`User request requires specialized assistance from ${targetAgent.name}`;
				addHistory({
					type: "agent",
					text: `🔄 Initiating transfer to ${targetAgent.name}: ${transferReason}`,
				});

				// Apply delay if specified
				if (delay && delay > 0) {
					log(`⏳ Applying transfer delay: ${delay} seconds`);
					await new Promise((resolve) => setTimeout(resolve, delay * 1000));
				}

				// Prepare transfer response (ElevenLabs will handle the actual transfer)
				const transferResponse = {
					status: "transfer_initiated",
					target_agent: {
						index: agent_number,
						name: targetAgent.name,
						description: targetAgent.description,
						specializations: targetAgent.specializations,
					},
					reason: transferReason,
					transfer_message:
						transfer_message ||
						`You are being transferred to ${targetAgent.name} for specialized assistance.`,
					timestamp: Date.now(),
				};

				log("🎯 TRANSFER INITIATED:", transferResponse);
				addHistory({
					type: "system",
					text: `Transfer to ${targetAgent.name} initiated: ${transferReason}`,
				});

				// Note: The actual agent transfer is handled by ElevenLabs system
				// This clientTool provides the context and logging for the transfer
				return JSON.stringify(transferResponse);
			},
		}),
		[
			queryClient,
			getPlaceSuggestionsAction,
			getSessionToken,
			clearSessionToken,
			log,
			setActiveSearch,
			setSelectedResult,
			setCurrentIntent,
			addHistory,
			setAgentRequestedManual,
			setAgentLastSearchQuery,
			clearSelectionAndSearch,
			onSelectResult,
			currentIntent,
			getCachedOrFetchPlaceDetails,
		],
	);

	// Ensure type safety - this will cause TypeScript errors if tools are missing
	const typeSafeClientTools: ClientToolsImplementation = clientTools;

	return typeSafeClientTools;
}
