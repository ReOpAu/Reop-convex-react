import { useCallback, useState } from "react";
import { searchAddressApi } from "~/services/address-api.client";
import { classifyIntent } from "~/utils/addressFinderUtils";

export type LocationIntent = "suburb" | "street" | "address" | "general";

export interface EnhancedPlaceSuggestion {
	placeId: string;
	description: string;
	types: string[];
	matchedSubstrings: Array<{ length: number; offset: number }>;
	structuredFormatting: {
		mainText: string;
		secondaryText: string;
		main_text?: string;
		secondary_text?: string;
		main_text_matched_substrings?: Array<{ length: number; offset: number }>;
	};
	resultType: "suburb" | "street" | "address" | "general";
	confidence: number;
}

export interface EnhancedPlaceSearchResult {
	success: boolean;
	suggestions: EnhancedPlaceSuggestion[];
	detectedIntent: LocationIntent;
	error?: string;
}

interface UseEnhancedPlaceSuggestionsOptions {
	location?: { lat: number; lng: number };
	radius?: number;
	maxResults?: number;
}

export function useEnhancedPlaceSuggestions(
	options: UseEnhancedPlaceSuggestionsOptions = {},
) {
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [lastResult, setLastResult] =
		useState<EnhancedPlaceSearchResult | null>(null);

	const searchPlaces = useCallback(
		async (query: string): Promise<EnhancedPlaceSearchResult> => {
			if (!query.trim()) {
				const emptyResult = {
					success: false,
					suggestions: [],
					detectedIntent: "general" as LocationIntent,
					error: "Query cannot be empty",
				};
				setLastResult(emptyResult);
				return emptyResult;
			}

			setIsLoading(true);
			setError(null);

			try {
				const classifiedIntent = classifyIntent(query.trim());
				const allowedIntents = [
					"address",
					"suburb",
					"street",
					"general",
				] as const;
				const safeIntent:
					| "address"
					| "suburb"
					| "street"
					| "general"
					| undefined = allowedIntents.includes(classifiedIntent as any)
					? (classifiedIntent as (typeof allowedIntents)[number])
					: undefined;

				const result = await searchAddressApi({
					query: query.trim(),
					intent: safeIntent,
					maxResults: options.maxResults || 8,
					location: options.location,
					radius: options.radius,
				});

				const enhancedResult: EnhancedPlaceSearchResult = {
					success: result.success,
					suggestions: result.success ? result.suggestions : [],
					detectedIntent: result.success ? result.detectedIntent : "general",
					error: result.success ? undefined : result.error,
				};

				setLastResult(enhancedResult);

				if (!result.success) {
					setError(result.error);
				}

				return enhancedResult;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error occurred";
				setError(errorMessage);

				const errorResult = {
					success: false,
					suggestions: [],
					detectedIntent: "general" as LocationIntent,
					error: errorMessage,
				};

				setLastResult(errorResult);
				return errorResult;
			} finally {
				setIsLoading(false);
			}
		},
		[
			options.location,
			options.maxResults,
			options.radius,
		],
	);

	const reset = useCallback(() => {
		setError(null);
		setLastResult(null);
		setIsLoading(false);
	}, []);

	return {
		searchPlaces,
		isLoading,
		error,
		lastResult,
		reset,
		setEnhancedResult: setLastResult,
	};
}
