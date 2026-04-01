import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCartesiaAudioManager } from "~/cartesia/hooks/useCartesiaAudioManager";
import { useCartesiaConversation } from "~/cartesia/hooks/useCartesiaConversation";
import { useCartesiaEventHandler } from "~/cartesia/hooks/useCartesiaEventHandler";
import type { RuralConfirmationState } from "~/hooks/actions/types";
import { useActionHandler } from "~/hooks/useActionHandler";
import {
	type AutoCorrectionData,
	useAddressAutoSelection,
} from "~/hooks/useAddressAutoSelection";
import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import { useAddressSession } from "~/hooks/useAddressSession";
import { useVelocityIntentClassification } from "~/hooks/useVelocityIntentClassification";
import { useAddressSelectionStore } from "~/stores/addressSelectionStore";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import { useApiStore } from "~/stores/apiStore";
import { useHistoryStore } from "~/stores/historyStore";
import { useIntentStore } from "~/stores/intentStore";
import { useSearchHistoryStore } from "~/stores/searchHistoryStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import type {
	HistoryItem,
	LocationIntent,
	Mode,
	Suggestion,
} from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";

// Constants
const DEBOUNCE_DELAY = 300;

interface CartesiaAddressFinderBrainProps {
	children: (handlers: CartesiaAddressFinderBrainHandlers) => React.ReactNode;
}

export interface CartesiaAddressFinderBrainHandlers {
	// Core handlers
	handleSelectResult: (result: Suggestion) => void;
	handleStartRecording: () => void;
	handleStopRecording: () => void;
	handleClear: (source: "user" | "agent") => void;
	handleAcceptRuralAddress: () => void;
	handleRecallPreviousSearch: (entry: SearchHistoryEntry) => void;
	handleRecallConfirmedSelection: (entry: AddressSelectionEntry) => void;
	handleManualTyping: (query: string) => void;
	handleHideOptions: () => void;

	// State from stores
	state: {
		suggestions: Suggestion[];
		isLoading: boolean;
		searchQuery: string;
		selectedResult: Suggestion | null;
		currentIntent: LocationIntent;
		isRecording: boolean;
		isVoiceActive: boolean;
		agentRequestedManual: boolean;
		history: HistoryItem[];
		searchHistory: SearchHistoryEntry[];
		addressSelections: AddressSelectionEntry[];
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

/**
 * No-op syncToAgent — Cartesia agent manages its own state server-side,
 * so we don't need to push state via window.setVariable like ElevenLabs.
 */
const noopSyncToAgent = () => {};

export function CartesiaAddressFinderBrain({
	children,
}: CartesiaAddressFinderBrainProps) {
	const queryClient = useQueryClient();

	// Cartesia config
	const agentId = import.meta.env.VITE_CARTESIA_AGENT_ID || "";
	const clearSessionMutation = useMutation(
		api.cartesia.sessionState.clearSession,
	);
	const cartesiaSessionIdRef = useRef<string | null>(null);
	const [cartesiaSessionId, setCartesiaSessionId] = useState<string | null>(
		null,
	);

	// Token minting: prefer Convex action, fall back to env var for local dev
	const getAccessTokenAction = useAction(
		api.cartesia.getAccessToken.getAccessToken,
	);

	const getOrCreateCartesiaSessionId = useCallback(() => {
		if (!cartesiaSessionIdRef.current) {
			const nextSessionId = `cartesia_${crypto.randomUUID()}`;
			cartesiaSessionIdRef.current = nextSessionId;
			setCartesiaSessionId(nextSessionId);
		}

		return cartesiaSessionIdRef.current;
	}, []);

	const getAuthToken = useCallback(async (): Promise<string | null> => {
		try {
			const result = await getAccessTokenAction({
				sessionId: getOrCreateCartesiaSessionId(),
			});
			if (result.success) {
				return result.token;
			}
			console.warn("[Cartesia] Token mint failed:", result.error);
		} catch (err) {
			console.warn("[Cartesia] Token mint error:", err);
		}
		return null;
	}, [getAccessTokenAction, getOrCreateCartesiaSessionId]);

	// --- Cartesia hooks ---
	const {
		status: cartesiaStatus,
		startSession: wsStartSession,
		endSession: wsEndSession,
		sendMediaInput,
	} = useCartesiaConversation({
		agentId,
		sessionId: cartesiaSessionId,
		getAuthToken,
		onMediaOutput: (base64Data) => playAudioChunk(base64Data),
		onClear: () => flushAudio(),
	});

	// State bridge: subscribe to Convex for updates from the Python agent
	useCartesiaEventHandler({
		sessionId: cartesiaSessionId ?? "",
		enabled: cartesiaStatus === "connected",
	});

	const { startCapture, stopCapture, playAudioChunk, flushAudio } =
		useCartesiaAudioManager({ sendMediaInput });

	// --- State from stores (identical to ElevenLabs Brain) ---
	const {
		isRecording,
		isVoiceActive,
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

	// --- Address Recall (inline, no ElevenLabs dependency) ---
	const [isRecallMode, setIsRecallMode] = useState(false);
	const [preserveIntent, setPreserveIntent] = useState<LocationIntent | null>(
		null,
	);

	const getPlaceSuggestionsAction = useAction(
		api.address.getPlaceSuggestions.getPlaceSuggestions,
	);

	const handleRecallPreviousSearch = useCallback(
		async (entry: SearchHistoryEntry) => {
			setActiveSearch({ query: entry.query, source: entry.context.mode });
			setCurrentIntent(entry.context.intent as LocationIntent);
			setAgentLastSearchQuery(entry.query);
			setSelectedResult(null);
			setIsRecallMode(true);

			const newResults = await getPlaceSuggestionsAction({
				query: entry.query,
				intent: entry.context.intent as
					| "general"
					| "suburb"
					| "street"
					| "address"
					| undefined,
				isAutocomplete: false,
				sessionToken: undefined,
			});

			setApiResults({
				suggestions: newResults.success ? newResults.suggestions : [],
				isLoading: false,
				error: newResults.success ? null : newResults.error,
				source: entry.context.mode,
			});

			queryClient.setQueryData(
				["addressSearch", entry.query],
				newResults.success ? newResults.suggestions : [],
			);
		},
		[
			setActiveSearch,
			setCurrentIntent,
			setAgentLastSearchQuery,
			setApiResults,
			setSelectedResult,
			queryClient,
			getPlaceSuggestionsAction,
		],
	);

	const handleRecallConfirmedSelection = useCallback(
		(entry: AddressSelectionEntry) => {
			setActiveSearch({
				query: entry.originalQuery,
				source: entry.context.mode as Mode,
			});
			setCurrentIntent(entry.context.intent as LocationIntent);
			setAgentLastSearchQuery(entry.originalQuery);
			setPreserveIntent(entry.context.intent as LocationIntent);
			setApiResults({
				suggestions: [entry.selectedAddress],
				isLoading: false,
				error: null,
				source: entry.context.mode as Mode,
			});
			setSelectedResult(entry.selectedAddress);
			const existingSuggestions = queryClient.getQueryData<Suggestion[]>([
				"addressSearch",
				entry.originalQuery,
			]);
			if (!existingSuggestions || existingSuggestions.length <= 1) {
				queryClient.setQueryData(
					["addressSearch", entry.originalQuery],
					[entry.selectedAddress],
				);
			}
			setIsRecallMode(true);
		},
		[
			setActiveSearch,
			setCurrentIntent,
			setAgentLastSearchQuery,
			setApiResults,
			setSelectedResult,
			queryClient,
		],
	);

	const resetRecallMode = useCallback(() => {
		setIsRecallMode(false);
		setPreserveIntent(null);
	}, []);

	// Logging utility
	const log = useCallback((...args: unknown[]) => {
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[CartesiaAddressFinderBrain]", ...args);
		}
	}, []);

	// Temporary conversation ref for useActionHandler
	const conversationRef = useRef<any>(null);

	// API actions
	const getPlaceDetailsAction = useAction(
		api.address.getPlaceDetails.getPlaceDetails,
	);

	const {
		handleSelectResult: consolidatedHandleSelectResult,
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
		clearSessionToken,
		isRecording,
		conversationRef,
		queryClient,
		clearSelectionAndSearch,
		getPlaceDetailsAction,
		setAgentLastSearchQuery,
		addAddressSelection,
		searchQuery,
		currentIntent,
		preserveIntent,
		setPreserveIntent,
		resetRecallMode,
		syncToAgent: noopSyncToAgent,
	});

	const handleSelectResult = consolidatedHandleSelectResult;

	// --- Recording handlers (Cartesia-specific) ---
	const handleStartRecording = useCallback(async () => {
		const activeSessionId = getOrCreateCartesiaSessionId();
		await wsStartSession(activeSessionId);
		await startCapture();
	}, [getOrCreateCartesiaSessionId, wsStartSession, startCapture]);

	const handleStopRecording = useCallback(() => {
		const activeSessionId = cartesiaSessionIdRef.current;
		stopCapture();
		wsEndSession();
		cartesiaSessionIdRef.current = null;
		setCartesiaSessionId(null);
		if (activeSessionId) {
			clearSessionMutation({ sessionId: activeSessionId }).catch((error) => {
				console.warn("[Cartesia] Failed to clear session", error);
			});
		}
	}, [stopCapture, wsEndSession, clearSessionMutation]);

	// --- Query management (identical to ElevenLabs Brain) ---
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
					`Velocity-based classification: "${searchQuery}" → "${velocityDetectedIntent}" (was: "${storeIntent}")`,
				);
				setCurrentIntent(velocityDetectedIntent);
			}
		}
	}, [shouldClassifyByVelocity, velocityDetectedIntent, searchQuery, log]);

	// Handle typing in manual search form
	const handleManualTyping = useCallback(
		(query: string) => {
			if (!isRecallMode && !selectedResult) {
				setActiveSearch({ query, source: "manual" });
			}
		},
		[setActiveSearch, isRecallMode, selectedResult],
	);

	// --- Computed state ---
	const shouldShowSuggestions =
		(suggestions.length > 0 && !selectedResult && !isLoading) ||
		(showingOptionsAfterConfirmation && suggestions.length > 0);
	const shouldShowManualForm = !isRecording || agentRequestedManual;
	const shouldShowSelectedResult = Boolean(
		selectedResult && !isValidating && !showingOptionsAfterConfirmation,
	);
	const shouldShowValidationStatus = Boolean(isValidating || validationError);

	const handleHideOptions = useCallback(() => {
		setShowingOptionsAfterConfirmation(false);
	}, [setShowingOptionsAfterConfirmation]);

	// Map Cartesia status to conversation status string
	const conversationStatus =
		cartesiaStatus === "connected" ? "connected" : cartesiaStatus;

	const handlers: CartesiaAddressFinderBrainHandlers = {
		handleSelectResult,
		handleStartRecording,
		handleStopRecording,
		handleClear,
		handleAcceptRuralAddress,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		handleManualTyping,
		handleHideOptions,

		state: {
			suggestions,
			isLoading,
			searchQuery,
			selectedResult,
			currentIntent,
			isRecording,
			isVoiceActive,
			agentRequestedManual,
			history,
			searchHistory,
			addressSelections,
		},

		shouldShowSuggestions,
		shouldShowManualForm,
		shouldShowSelectedResult,
		shouldShowValidationStatus,
		showLowConfidence,
		showingOptionsAfterConfirmation,

		autoCorrection,

		isValidating,
		validationError,
		pendingRuralConfirmation,

		sessionToken: getCurrentSessionToken(),
		conversationStatus,
	};

	return <>{children(handlers)}</>;
}
