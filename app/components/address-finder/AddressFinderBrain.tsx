import { ConversationProvider } from "@elevenlabs/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceVisualizerSource } from "~/components/address-finder/voice-visualizer/types";
import { useAgentSync } from "~/elevenlabs/hooks/useAgentSync";
import type { RuralConfirmationState } from "~/hooks/actions/types";
import { useActionHandler } from "~/hooks/useActionHandler";
import {
	type AutoCorrectionData,
	useAddressAutoSelection,
} from "~/hooks/useAddressAutoSelection";
import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import { useAddressRecall } from "~/hooks/useAddressRecall";
import { useAddressSession } from "~/hooks/useAddressSession";
import { useConversationLifecycle } from "~/hooks/useConversationLifecycle";
import { useVelocityIntentClassification } from "~/hooks/useVelocityIntentClassification";
import { useAddressSelectionStore } from "~/stores/addressSelectionStore";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import { useApiStore } from "~/stores/apiStore";
import { useHistoryStore } from "~/stores/historyStore";
import { useIntentStore } from "~/stores/intentStore";
import { getPlaceDetailsApi } from "~/services/address-api.client";
import { useSearchHistoryStore } from "~/stores/searchHistoryStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import type { HistoryItem, LocationIntent, Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";
import {
	classifyIntent,
	classifySelectedResult,
} from "~/utils/addressFinderUtils";
import type { ManualAutocompleteState } from "./ManualSearchForm";

// Constants
const DEBOUNCE_DELAY = 300;

interface AddressFinderBrainProps {
	children: (handlers: AddressFinderBrainHandlers) => React.ReactNode;
}

export interface AddressFinderBrainHandlers {
	// Core handlers
	handleSelectResult: (result: Suggestion) => void;
	handleStartRecording: () => void;
	handleStopRecording: () => void;
	handleClear: (source: "user" | "agent") => void;
	handleAcceptRuralAddress: () => void;
	handleRecallPreviousSearch: (entry: SearchHistoryEntry) => void;
	handleRecallConfirmedSelection: (entry: AddressSelectionEntry) => void;
	handleManualTyping: (query: string) => void;
	handleManualAutocompleteStateChange: (
		state: ManualAutocompleteState,
	) => void;
	handleHideOptions: () => void;

	// State from stores (exposed to UI so UI doesn't import stores directly)
	state: {
		suggestions: Suggestion[];
		isLoading: boolean;
		searchQuery: string;
		selectedResult: Suggestion | null;
		currentIntent: LocationIntent;
		isRecording: boolean;
		isVoiceActive: boolean;
		isAgentSpeaking: boolean;
		agentRequestedManual: boolean;
		voiceVisualizer: VoiceVisualizerSource | null;
		history: HistoryItem[];
		searchHistory: SearchHistoryEntry[];
		addressSelections: AddressSelectionEntry[];
		getSessionToken: () => string;
		clearSessionToken: () => void;
	};

	// Computed state
	shouldShowSuggestions: boolean;
	shouldShowManualForm: boolean;
	shouldShowSelectedResult: boolean;
	shouldShowValidationStatus: boolean;
	showLowConfidence: boolean;
	showingOptionsAfterConfirmation: boolean;

	// Auto-correction state
	autoCorrection: AutoCorrectionData | null;

	// Validation state
	isValidating: boolean;
	validationError: string | null;
	pendingRuralConfirmation: RuralConfirmationState["pendingRuralConfirmation"];

	// Session management
	sessionToken: string | null;
	conversationStatus: string;
}

export function AddressFinderBrain({ children }: AddressFinderBrainProps) {
	return (
		<ConversationProvider>
			<AddressFinderBrainContent>{children}</AddressFinderBrainContent>
		</ConversationProvider>
	);
}

function AddressFinderBrainContent({ children }: AddressFinderBrainProps) {
	const queryClient = useQueryClient();
	const { syncToAgent } = useAgentSync();

	// State from stores
	const {
		isRecording,
		isVoiceActive,
		isAgentSpeaking,
		agentRequestedManual,
		showingOptionsAfterConfirmation,
		setAgentRequestedManual,
		setSelectionAcknowledged,
		setShowingOptionsAfterConfirmation,
	} = useUIStore();

	const {
		searchQuery,
		selectedResult,
		currentIntent,
		activeSearchSource,
		agentLastSearchQuery,
		setActiveSearch,
		setSelectedResult,
		setCurrentIntent,
		setAgentLastSearchQuery,
	} = useIntentStore();

	const { setApiResults } = useApiStore();
	const { history, addHistory } = useHistoryStore();
	const { clearSelectionAndSearch } = useAddressFinderActions();
	const { searchHistory, addSearchToHistory } = useSearchHistoryStore();
	const { addressSelections } = useAddressSelectionStore();
	const addAddressSelection = useAddressSelectionStore(
		(s) => s.addAddressSelection,
	);

	// Local component state
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

	// Custom hooks for extracted logic
	const { getSessionToken, clearSessionToken, getCurrentSessionToken } =
		useAddressSession();

	const {
		isRecallMode,
		preserveIntent,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		resetRecallMode,
		setPreserveIntent,
	} = useAddressRecall();

	// Logging utility
	const log = useCallback((...args: unknown[]) => {
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[AddressFinderBrain]", ...args);
		}
	}, []);

	// Temporary conversation ref for useActionHandler
	const conversationRef = useRef<any>(null);

	const {
		handleSelectResult: consolidatedHandleSelectResult,
		handleSelect,
		isValidating,
		validationError,
		handleClear,
		pendingRuralConfirmation,
		handleAcceptRuralAddress,
	} = useActionHandler({
		log,
		setCurrentIntent,
		setSelectedResult,
		setActiveSearch,
		setAgentRequestedManual,
		addHistory,
		getSessionToken,
		getCurrentSessionToken,
		clearSessionToken,
		isRecording,
		conversationRef,
		queryClient,
		clearSelectionAndSearch,
		// New dependencies for consolidated selection logic
		getPlaceDetailsAction: getPlaceDetailsApi,
		setAgentLastSearchQuery,
		addAddressSelection,
		searchQuery,
		currentIntent,
		preserveIntent,
		setPreserveIntent,
		resetRecallMode,
		syncToAgent,
	});

	// Use the consolidated selection handler from useActionHandler
	const handleSelectResult = consolidatedHandleSelectResult;

	// Initialize conversation lifecycle with the handleSelectResult
	const {
		conversation,
		handleStartRecording: startConversationRecording,
		handleStopRecording,
		handleRequestAgentState,
		voiceVisualizer,
	} = useConversationLifecycle({
		getSessionToken,
		clearSessionToken,
		handleSelectResult,
	});

	// Update the conversation ref for useActionHandler
	useEffect(() => {
		conversationRef.current = conversation;
	}, [conversation]);

	// Query management - use correct cache key based on mode
	const effectiveQueryKey =
		showingOptionsAfterConfirmation && agentLastSearchQuery
			? agentLastSearchQuery
			: searchQuery;

	const {
		data: suggestions = [],
		isLoading,
		isError,
		error,
	} = useQuery<Suggestion[]>({
		queryKey: ["addressSearch", effectiveQueryKey],
		queryFn: () => {
			return (
				queryClient.getQueryData<Suggestion[]>([
					"addressSearch",
					effectiveQueryKey,
				]) || []
			);
		},
		enabled: isRecording || showingOptionsAfterConfirmation,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	// Auto-selection logic
	const { showLowConfidence, autoCorrection } = useAddressAutoSelection({
		suggestions,
		isLoading,
		isError,
		onSelectResult: handleSelectResult,
	});

	// Sync React Query state to stores
	useEffect(() => {
		if (activeSearchSource === "manual" && !showingOptionsAfterConfirmation) {
			return;
		}

		const suggestionsFromCache =
			queryClient.getQueryData<Suggestion[]>([
				"addressSearch",
				effectiveQueryKey,
			]) || [];
		setApiResults({
			suggestions: suggestionsFromCache,
			isLoading,
			error: error ? (error as Error).message : null,
			source: activeSearchSource,
		});

		// Add searches with multiple results to search history (only for new searches, not "show options again")
		if (
			searchQuery &&
			suggestionsFromCache.length >= 2 &&
			!isRecallMode &&
			!showingOptionsAfterConfirmation
		) {
			addSearchToHistory({
				query: searchQuery,
				resultCount: suggestionsFromCache.length,
				context: {
					mode: activeSearchSource === "voice" ? "voice" : "manual",
					intent: currentIntent ?? "general",
				},
			});
		}

		syncToAgent();
	}, [
		isLoading,
		error,
		effectiveQueryKey,
		activeSearchSource,
		queryClient,
		addSearchToHistory,
		isRecallMode,
		currentIntent,
		showingOptionsAfterConfirmation,
	]);

	// Debounced search query effect
	useEffect(() => {
		const timer = setTimeout(() => {
			if (!isRecording && searchQuery !== debouncedSearchQuery) {
				setDebouncedSearchQuery(searchQuery);
			}
		}, DEBOUNCE_DELAY);
		return () => clearTimeout(timer);
	}, [searchQuery, isRecording, debouncedSearchQuery]);

	// Velocity-based intent classification for manual typing
	const {
		shouldClassify: shouldClassifyByVelocity,
		detectedIntent: velocityDetectedIntent,
		typingState,
	} = useVelocityIntentClassification(
		searchQuery || "",
		currentIntent || "general",
		{
			enabled:
				!isRecording &&
				!isRecallMode &&
				!selectedResult &&
				!!searchQuery &&
				searchQuery.length >= 2,
			velocityChangeThreshold: 2.0,
			minBaselineKeystrokes: 3,
			maxIntervalForBaseline: 1000,
		},
	);

	// Apply velocity-based intent classification
	useEffect(() => {
		if (shouldClassifyByVelocity && velocityDetectedIntent) {
			const storeIntent = useIntentStore.getState().currentIntent;
			if (velocityDetectedIntent !== storeIntent) {
				log(
					`🚀 Velocity-based classification: "${searchQuery}" → "${velocityDetectedIntent}" (was: "${storeIntent}")`,
				);
				setCurrentIntent(velocityDetectedIntent);
			}
		}
	}, [shouldClassifyByVelocity, velocityDetectedIntent, searchQuery, log]);

	const handleStartRecording = useCallback(() => {
		setSelectionAcknowledged(false);
		startConversationRecording();
	}, [setSelectionAcknowledged, startConversationRecording]);

	// Handle typing in manual search form
	const handleManualTyping = useCallback(
		(query: string) => {
			if (!isRecallMode && !selectedResult) {
				setSelectionAcknowledged(false);
				setActiveSearch({ query, source: "manual" });
			}
		},
		[setActiveSearch, setSelectionAcknowledged, isRecallMode, selectedResult],
	);

	const handleManualAutocompleteStateChange = useCallback(
		({ query, suggestions, isLoading, error }: ManualAutocompleteState) => {
			const {
				activeSearchSource: currentSource,
				searchQuery: currentSearchQuery,
			} = useIntentStore.getState();

			const isCurrentManualState =
				currentSource === "manual" ||
				query === currentSearchQuery ||
				(query === "" && currentSearchQuery === "");

			if (!isCurrentManualState) {
				return;
			}

			setApiResults({
				suggestions,
				isLoading,
				error,
				source: "manual",
			});
			syncToAgent();
		},
		[setApiResults, syncToAgent],
	);

	// Computed state
	const shouldShowSuggestions =
		(suggestions.length > 0 && !selectedResult && !isLoading) ||
		(showingOptionsAfterConfirmation && suggestions.length > 0);
	const shouldShowManualForm = !isRecording || agentRequestedManual;
	const shouldShowSelectedResult = Boolean(
		selectedResult && !isValidating && !showingOptionsAfterConfirmation,
	);
	const shouldShowValidationStatus = Boolean(isValidating || validationError);

	// Handler for hiding options (used by UI to close "show options again" panel)
	const handleHideOptions = useCallback(() => {
		setShowingOptionsAfterConfirmation(false);
	}, [setShowingOptionsAfterConfirmation]);

	const handlers: AddressFinderBrainHandlers = {
		// Core handlers
		handleSelectResult,
		handleStartRecording,
		handleStopRecording,
		handleClear,
		handleAcceptRuralAddress,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		handleManualTyping,
		handleManualAutocompleteStateChange,
		handleHideOptions,

		// State from stores (exposed to UI so UI doesn't import stores directly)
		state: {
			suggestions,
			isLoading,
			searchQuery,
			selectedResult,
			currentIntent,
			isRecording,
			isVoiceActive,
			isAgentSpeaking,
			agentRequestedManual,
			voiceVisualizer,
			history,
			searchHistory,
			addressSelections,
			getSessionToken,
			clearSessionToken,
		},

		// Computed state
		shouldShowSuggestions,
		shouldShowManualForm,
		shouldShowSelectedResult,
		shouldShowValidationStatus,
		showLowConfidence,
		showingOptionsAfterConfirmation,

		// Auto-correction state
		autoCorrection,

		// Validation state
		isValidating,
		validationError,
		pendingRuralConfirmation,

		// Session management
		sessionToken: getCurrentSessionToken(),
		conversationStatus: conversation.status,
	};

	return <>{children(handlers)}</>;
}
