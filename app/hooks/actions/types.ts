import type { useConversation } from "@elevenlabs/react";
import type { QueryClient } from "@tanstack/react-query";
import type { RefObject } from "react";
import type { HistoryItem, LocationIntent, Suggestion } from "~/stores/types";

/**
 * Shared context interface for all action modules.
 * This provides the dependencies that action factories need.
 */
export interface ActionContext {
	// Logging
	log: (...args: unknown[]) => void;

	// Intent state management
	setCurrentIntent: (intent: LocationIntent) => void;
	currentIntent: LocationIntent | null;
	preserveIntent: LocationIntent | null;
	setPreserveIntent: (intent: LocationIntent | null) => void;

	// Selection state management
	setSelectedResult: (result: Suggestion | null) => void;
	setActiveSearch: (payload: {
		query: string;
		source: "manual" | "voice";
	}) => void;
	searchQuery: string;

	// UI state management
	setAgentRequestedManual: (requested: boolean) => void;
	isRecording: boolean;

	// History management
	addHistory: (item: HistoryItem) => void;

	// Session management
	getSessionToken: () => string;
	getCurrentSessionToken: () => string | null;
	clearSessionToken: () => void;

	// Agent communication
	conversationRef: RefObject<ReturnType<typeof useConversation> | null>;

	// Query client for caching
	queryClient: QueryClient;

	// Actions
	clearSelectionAndSearch: () => void;
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
	validateAddressAction: (params: { address: string }) => Promise<{
		success: boolean;
		isValid?: boolean;
		isRuralException?: boolean;
		validationGranularity?: string;
		result?: {
			address: { formattedAddress: string };
			geocode: {
				placeId: string;
				location?: { latitude: number; longitude: number };
			};
		};
		formattedAddress?: string;
		placeId?: string;
		location?: { latitude: number; longitude: number };
		error?: string;
	}>;

	// Selection tracking
	setAgentLastSearchQuery: (query: string | null) => void;
	addAddressSelection: (entry: {
		originalQuery: string;
		selectedAddress: Suggestion;
		context: { mode: "voice" | "manual"; intent: LocationIntent };
	}) => void;

	// Recall mode
	resetRecallMode: () => void;

	// Sync
	syncToAgent: () => void;
	performReliableSync: (context: string) => Promise<void>;
}

/**
 * Internal state for validation flow.
 */
export interface ValidationState {
	isValidating: boolean;
	setIsValidating: (value: boolean) => void;
	validationError: string | null;
	setValidationError: (error: string | null) => void;
}

/**
 * Internal state for rural confirmation flow.
 */
export interface RuralConfirmationState {
	pendingRuralConfirmation: {
		result: Suggestion;
		validation: {
			formattedAddress?: string;
			placeId?: string;
			validationGranularity?: string;
			error?: string;
		};
	} | null;
	setPendingRuralConfirmation: (
		value: {
			result: Suggestion;
			validation: {
				formattedAddress?: string;
				placeId?: string;
				validationGranularity?: string;
				error?: string;
			};
		} | null,
	) => void;
}

/**
 * Combined internal state for action handlers.
 */
export type ActionInternalState = ValidationState & RuralConfirmationState;

// Constants for place details enrichment
export const ENRICHMENT_CACHE_KEY = "placeDetails";
