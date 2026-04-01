import type { useConversation } from "@elevenlabs/react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { type RefObject, useCallback, useMemo, useState } from "react";
import { useReliableSync } from "~/elevenlabs/hooks/useReliableSync";
import type { HistoryItem, LocationIntent, Suggestion } from "~/stores/types";

// Import action factories from decomposed modules
import {
	type ActionContext,
	type ActionInternalState,
	createClearActions,
	createRuralActions,
	createSelectionActions,
} from "./actions";

type UseActionHandlerDependencies = {
	log: (...args: unknown[]) => void;
	setCurrentIntent: (intent: LocationIntent) => void;
	setSelectedResult: (result: Suggestion | null) => void;
	setActiveSearch: (payload: {
		query: string;
		source: "manual" | "voice";
	}) => void;
	setAgentRequestedManual: (requested: boolean) => void;
	addHistory: (item: HistoryItem) => void;
	getSessionToken: () => string;
	getCurrentSessionToken: () => string | null;
	clearSessionToken: () => void;
	isRecording: boolean;
	conversationRef: RefObject<ReturnType<typeof useConversation> | null>;
	queryClient: QueryClient;
	clearSelectionAndSearch: () => void;
	// Dependencies for consolidated selection logic
	getPlaceDetailsAction: (params: {
		placeId: string;
		sessionToken?: string;
	}) => Promise<{
		success: boolean;
		details?: {
			formattedAddress: string;
			lat: number;
			lng: number;
			types: string[];
			suburb?: string;
			postcode?: string;
		};
		error?: string;
	}>;
	setAgentLastSearchQuery: (query: string | null) => void;
	addAddressSelection: (entry: {
		originalQuery: string;
		selectedAddress: Suggestion;
		context: { mode: "voice" | "manual"; intent: LocationIntent };
	}) => void;
	searchQuery: string;
	currentIntent: LocationIntent | null;
	preserveIntent: LocationIntent | null;
	setPreserveIntent: (intent: LocationIntent | null) => void;
	resetRecallMode: () => void;
	syncToAgent: () => void;
};

export function useActionHandler({
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
	getPlaceDetailsAction,
	setAgentLastSearchQuery,
	addAddressSelection,
	searchQuery,
	currentIntent,
	preserveIntent,
	setPreserveIntent,
	resetRecallMode,
	syncToAgent,
}: UseActionHandlerDependencies) {
	// Internal state for validation flow
	const [isValidating, setIsValidating] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [pendingRuralConfirmation, setPendingRuralConfirmation] = useState<{
		result: Suggestion;
		validation: {
			formattedAddress?: string;
			placeId?: string;
			error?: string;
		};
	} | null>(null);

	// Convex actions
	const validateAddressAction = useAction(
		api.address.validateAddress.validateAddress,
	);
	const { performReliableSync } = useReliableSync();

	// Build action context
	const ctx: ActionContext = useMemo(
		() => ({
			log,
			setCurrentIntent,
			currentIntent,
			preserveIntent,
			setPreserveIntent,
			setSelectedResult,
			setActiveSearch,
			searchQuery,
			setAgentRequestedManual,
			isRecording,
			addHistory,
			getSessionToken,
			getCurrentSessionToken,
			clearSessionToken,
			conversationRef,
			queryClient,
			clearSelectionAndSearch,
			getPlaceDetailsAction,
			validateAddressAction,
			setAgentLastSearchQuery,
			addAddressSelection,
			resetRecallMode,
			syncToAgent,
			performReliableSync,
		}),
		[
			log,
			setCurrentIntent,
			currentIntent,
			preserveIntent,
			setPreserveIntent,
			setSelectedResult,
			setActiveSearch,
			searchQuery,
			setAgentRequestedManual,
			isRecording,
			addHistory,
			getSessionToken,
			getCurrentSessionToken,
			clearSessionToken,
			conversationRef,
			queryClient,
			clearSelectionAndSearch,
			getPlaceDetailsAction,
			validateAddressAction,
			setAgentLastSearchQuery,
			addAddressSelection,
			resetRecallMode,
			syncToAgent,
			performReliableSync,
		],
	);

	// Build internal state object
	const internalState: ActionInternalState = useMemo(
		() => ({
			isValidating,
			setIsValidating,
			validationError,
			setValidationError,
			pendingRuralConfirmation,
			setPendingRuralConfirmation,
		}),
		[isValidating, validationError, pendingRuralConfirmation],
	);

	// Create actions from factories
	const selectionActions = useMemo(
		() => createSelectionActions(ctx, internalState),
		[ctx, internalState],
	);

	const clearActions = useMemo(() => createClearActions(ctx), [ctx]);

	const ruralActions = useMemo(
		() => createRuralActions(ctx, internalState),
		[ctx, internalState],
	);

	// Wrap actions in useCallback for stable references
	const handleSelectResult = useCallback(
		async (result: Suggestion) => selectionActions.handleSelectResult(result),
		[selectionActions],
	);

	const handleSelect = useCallback(
		async (result: Suggestion) => selectionActions.handleSelect(result),
		[selectionActions],
	);

	const handleClear = useCallback(
		(context: "user" | "agent" = "user") => clearActions.handleClear(context),
		[clearActions],
	);

	const handleAcceptRuralAddress = useCallback(
		() => ruralActions.handleAcceptRuralAddress(),
		[ruralActions],
	);

	return {
		handleSelectResult,
		handleSelect,
		isValidating,
		validationError,
		handleClear,
		pendingRuralConfirmation,
		handleAcceptRuralAddress,
	};
}
