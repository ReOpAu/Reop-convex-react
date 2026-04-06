import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCartesiaAudioManager } from "~/cartesia/hooks/useCartesiaAudioManager";
import { useCartesiaConversation } from "~/cartesia/hooks/useCartesiaConversation";
import { useCartesiaEventHandler } from "~/cartesia/hooks/useCartesiaEventHandler";
import type { VoiceVisualizerSource } from "~/components/address-finder/voice-visualizer/types";
import type { RuralConfirmationState } from "~/hooks/actions/types";
import { useActionHandler } from "~/hooks/useActionHandler";
import {
	type AutoCorrectionData,
	useAddressAutoSelection,
} from "~/hooks/useAddressAutoSelection";
import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import { useAddressRecall } from "~/hooks/useAddressRecall";
import { useAddressSession } from "~/hooks/useAddressSession";
import { useVelocityIntentClassification } from "~/hooks/useVelocityIntentClassification";
import { getPlaceDetailsApi } from "~/services/address-api.client";
import { useAddressSelectionStore } from "~/stores/addressSelectionStore";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import { useApiStore } from "~/stores/apiStore";
import { useHistoryStore } from "~/stores/historyStore";
import { useIntentStore } from "~/stores/intentStore";
import { useSearchHistoryStore } from "~/stores/searchHistoryStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import type { HistoryItem, LocationIntent, Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";
import type { ManualAutocompleteState } from "./ManualSearchForm";

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
	handleManualAutocompleteStateChange: (
		state: ManualAutocompleteState,
	) => void;
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

/**
 * Cartesia agent state is bridged server-side, so browser-side manual/recall
 * flows do not need ElevenLabs variable sync.
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
	const {
		getSessionToken: getCartesiaOwnerToken,
		clearSessionToken: clearCartesiaOwnerToken,
		getCurrentSessionToken: getCurrentCartesiaOwnerToken,
	} = useAddressSession();
	const { getSessionToken, clearSessionToken, getCurrentSessionToken } =
		useAddressSession();

	// Token minting is handled server-side through Convex.
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
				anonymousOwnerToken: getCartesiaOwnerToken(),
			});
			if (result.success) {
				return result.token;
			}
			console.warn("[Cartesia] Token mint failed:", result.error);
			throw new Error(result.error);
		} catch (err) {
			console.warn("[Cartesia] Token mint error:", err);
			throw err instanceof Error ? err : new Error(String(err));
		}
	}, [
		getAccessTokenAction,
		getCartesiaOwnerToken,
		getOrCreateCartesiaSessionId,
	]);

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

	const {
		startCapture,
		playAudioChunk,
		flushAudio,
		destroyAudio,
		getInputByteFrequencyData,
		getOutputByteFrequencyData,
		getInputLevel,
		getOutputLevel,
	} = useCartesiaAudioManager({ sendMediaInput });

	const voiceVisualizer = useMemo<VoiceVisualizerSource>(
		() => ({
			provider: "cartesia",
			supportsInputAnalyser: true,
			supportsOutputAnalyser: true,
			getInputByteFrequencyData,
			getOutputByteFrequencyData,
			getInputLevel,
			getOutputLevel,
		}),
		[
			getInputByteFrequencyData,
			getInputLevel,
			getOutputByteFrequencyData,
			getOutputLevel,
		],
	);

	// --- State from stores (identical to ElevenLabs Brain) ---
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
	const {
		isRecallMode,
		preserveIntent,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		resetRecallMode,
		setPreserveIntent,
	} = useAddressRecall(noopSyncToAgent);

	// Logging utility
	const log = useCallback((...args: unknown[]) => {
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[CartesiaAddressFinderBrain]", ...args);
		}
	}, []);

	// Temporary conversation ref for useActionHandler
	const conversationRef = useRef<any>(null);

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
		getCurrentSessionToken,
		clearSessionToken,
		isRecording,
		conversationRef,
		queryClient,
		clearSelectionAndSearch,
		getPlaceDetailsAction: getPlaceDetailsApi,
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

	useCartesiaEventHandler({
		sessionId: cartesiaSessionId ?? "",
		enabled: cartesiaStatus === "connected",
		anonymousOwnerToken: getCurrentCartesiaOwnerToken(),
		flushAudio,
		handleSelectResult,
	});

	// --- Recording handlers (Cartesia-specific) ---
	const handleStartRecording = useCallback(async () => {
		const activeSessionId = getOrCreateCartesiaSessionId();
		setSelectionAcknowledged(false);

		try {
			await wsStartSession(activeSessionId);
			await startCapture();
		} catch (error) {
			wsEndSession();
			cartesiaSessionIdRef.current = null;
			setCartesiaSessionId(null);
			const anonymousOwnerToken =
				getCurrentCartesiaOwnerToken() ?? undefined;
			if (activeSessionId) {
				void clearSessionMutation({
					sessionId: activeSessionId,
					anonymousOwnerToken,
				}).catch((clearError) => {
					console.warn("[Cartesia] Failed to clear failed session", clearError);
				});
			}
			clearCartesiaOwnerToken();
			throw error;
		}
	}, [
		clearCartesiaOwnerToken,
		clearSessionMutation,
		getCurrentCartesiaOwnerToken,
		getOrCreateCartesiaSessionId,
		setSelectionAcknowledged,
		startCapture,
		wsEndSession,
		wsStartSession,
	]);

	const handleStopRecording = useCallback(async () => {
		const activeSessionId = cartesiaSessionIdRef.current;
		const anonymousOwnerToken = getCurrentCartesiaOwnerToken() ?? undefined;
		wsEndSession();
		await destroyAudio();
		cartesiaSessionIdRef.current = null;
		setCartesiaSessionId(null);
		if (activeSessionId) {
			void clearSessionMutation({
				sessionId: activeSessionId,
				anonymousOwnerToken,
			}).catch((error) => {
				console.warn("[Cartesia] Failed to clear session", error);
			});
		}
		clearCartesiaOwnerToken();
	}, [
		clearCartesiaOwnerToken,
		clearSessionMutation,
		destroyAudio,
		getCurrentCartesiaOwnerToken,
		wsEndSession,
	]);

	useEffect(() => {
		return () => {
			const activeSessionId = cartesiaSessionIdRef.current;
			const anonymousOwnerToken = getCurrentCartesiaOwnerToken() ?? undefined;
			wsEndSession();
			if (activeSessionId) {
				void clearSessionMutation({
					sessionId: activeSessionId,
					anonymousOwnerToken,
				}).catch((error) => {
					console.warn("[Cartesia] Failed to clear session on unmount", error);
				});
			}
			clearCartesiaOwnerToken();
			cartesiaSessionIdRef.current = null;
			setCartesiaSessionId(null);
		};
	}, [
		clearCartesiaOwnerToken,
		clearSessionMutation,
		getCurrentCartesiaOwnerToken,
		wsEndSession,
	]);

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
				setSelectionAcknowledged(false);
				setActiveSearch({ query, source: "manual" });
			}
		},
		[isRecallMode, selectedResult, setActiveSearch, setSelectionAcknowledged],
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
		},
		[setApiResults],
	);

	const handleClearSelection = useCallback(
		(source: "user" | "agent") => {
			flushAudio();
			handleClear(source);
		},
		[flushAudio, handleClear],
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
		handleClear: handleClearSelection,
		handleAcceptRuralAddress,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		handleManualTyping,
		handleManualAutocompleteStateChange,
		handleHideOptions,

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
