import type { PlaceSuggestion } from "@shared/types/location";
import { useCallback, useState } from "react";
import {
	searchAddressApi,
	validateAddressApi,
} from "~/services/address-api.client";
import type { LocationIntent } from "../stores/types";
import { classifyIntent } from "../utils/addressFinderUtils";

// Legacy interfaces needed by conversation interface
export interface SuburbResult {
	canonicalSuburb: string;
	placeId: string;
	geocode?: {
		lat: number;
		lng: number;
	};
	types: string[];
}

interface EnhancedSuburbResult {
	canonicalSuburb: string;
	placeId: string;
	// Geocode is optional and may be undefined if not implemented
	geocode?: {
		lat: number;
		lng: number;
	};
	types: string[];
}

export function useSuburbAutocomplete() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Enhanced state for new system
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [detectedIntent, setDetectedIntent] = useState<
		LocationIntent | undefined
	>(undefined);

	// Legacy state needed by conversation interface
	const [canonicalSuburb, setCanonicalSuburb] = useState<string | null>(null);
	const [enhancedResult, setEnhancedResult] =
		useState<EnhancedSuburbResult | null>(null);

	// Legacy functions for conversation interface (simplified versions)
	const lookupSuburb = async (suburbInput: string) => {
		setIsLoading(true);
		setError(null);

		try {
			const result = await searchAddressApi({
				query: suburbInput,
				intent: "suburb",
				maxResults: 1,
			});

			if (result.success && result.suggestions.length > 0) {
				const suggestion = result.suggestions[0];
				const canonicalName = suggestion.description;
				setCanonicalSuburb(canonicalName);
				return {
					success: true as const,
					canonicalSuburb: canonicalName,
				};
			}

			setError("No suburb found");
			return {
				success: false as const,
				error: "No suburb found",
			};
		} catch (err) {
			setError("Lookup failed - please try again");
			console.error("Suburb lookup error:", err);
			return { success: false as const, error: "Failed to lookup suburb" };
		} finally {
			setIsLoading(false);
		}
	};

	const lookupSuburbEnhanced = async (suburbInput: string) => {
		setIsLoading(true);
		setError(null);

		try {
			const result = await searchAddressApi({
				query: suburbInput,
				intent: "suburb",
				maxResults: 1,
			});

			if (result.success && result.suggestions.length > 0) {
				const suggestion = result.suggestions[0];
				const enhancedData = {
					canonicalSuburb: suggestion.description,
					placeId: suggestion.placeId,
					// Geocode fetching not implemented yet; set to undefined
					geocode: undefined,
					types: suggestion.types,
				};

				setCanonicalSuburb(enhancedData.canonicalSuburb);
				setEnhancedResult(enhancedData);

				return {
					success: true as const,
					...enhancedData,
				};
			}

			setError("No suburb found");
			return {
				success: false as const,
				error: "No suburb found",
			};
		} catch (err) {
			setError("Enhanced lookup failed - please try again");
			console.error("Enhanced suburb lookup error:", err);
			return {
				success: false as const,
				error: "Failed to lookup suburb details",
			};
		} finally {
			setIsLoading(false);
		}
	};

	const lookupSuburbMultiple = async (suburbInput: string, maxResults = 5) => {
		try {
			const result = await searchAddressApi({
				query: suburbInput,
				intent: "suburb",
				maxResults,
			});

			if (result.success && result.suggestions.length > 0) {
				const results = result.suggestions.map((suggestion) => ({
					canonicalSuburb: suggestion.description,
					placeId: suggestion.placeId,
					// Geocode fetching not implemented yet; set to undefined
					geocode: undefined,
					types: suggestion.types,
				}));

				return {
					success: true as const,
					results,
				};
			}

			return {
				success: false as const,
				error: "No suburbs found",
			};
		} catch (err) {
			console.error("Multiple suburb lookup error:", err);
			return { success: false as const, error: "Failed to lookup suburbs" };
		}
	};

	// New enhanced place suggestions method
	const validateFullAddress = async (address: string) => {
		setIsLoading(true);
		setError(null);

		try {
			const result = await validateAddressApi({
				address,
			});

			return result;
		} catch (err) {
			setError("Address validation failed - please try again");
			console.error("Address validation error:", err);
			return { success: false as const, error: "Failed to validate address" };
		} finally {
			setIsLoading(false);
		}
	};

	const getPlaceSuggestionsWithIntent = async (
		query: string,
		intent?: LocationIntent,
		options?: {
			maxResults?: number;
			location?: { lat: number; lng: number };
			radius?: number;
			isAutocomplete?: boolean;
		},
	) => {
		setIsLoading(true);
		setError(null);
		setSuggestions([]);
		setDetectedIntent(undefined);

		try {
			const result = await searchAddressApi({
				query,
				intent: intent ?? "suburb",
				maxResults: options?.maxResults,
				location: options?.location,
				radius: options?.radius,
				isAutocomplete: options?.isAutocomplete,
			});

			// --- UI-SIDE SUBURB FILTERING ---
			// See UNIFIED_ADDRESS_SYSTEM.md for rationale.
			if ((intent ?? "suburb") === "suburb" && result.success) {
				const hasSuburb = result.suggestions.some(
					(s) => s.resultType === "suburb" || s.types?.includes("locality"),
				);
				if (!hasSuburb) {
					if (result.suggestions.length > 0) {
						setError(
							"No suburb found, but here are some other results you may select, or try a different suburb.",
						);
						setSuggestions(result.suggestions); // Show suggestions, but do not auto-select
						return {
							success: true,
							suggestions: result.suggestions,
							detectedIntent: result.detectedIntent,
						};
					}
					setError(
						"No suburb found for this query. Please try a different suburb.",
					);
					setSuggestions([]);
					return { success: false, error: "No suburb found for this query." };
				}
			}

			if (result.success) {
				setSuggestions(result.suggestions);
				setDetectedIntent(result.detectedIntent);
				return result;
			}

			setError(result.error);
			return result;
		} catch (err) {
			setError("Place suggestions failed - please try again");
			console.error("Place suggestions error:", err);
			return { success: false, error: "Failed to get place suggestions" };
		} finally {
			setIsLoading(false);
		}
	};

	const reset = useCallback(() => {
		setIsLoading(false);
		setError(null);
		setSuggestions([]);
		setDetectedIntent(undefined);
		setCanonicalSuburb(null);
		setEnhancedResult(null);
	}, []);

	// Function to directly set results (for when agent confirms a selection)
	const setResult = useCallback((result: SuburbResult) => {
		setCanonicalSuburb(result.canonicalSuburb);
		setEnhancedResult({
			canonicalSuburb: result.canonicalSuburb,
			placeId: result.placeId,
			geocode: result.geocode,
			types: result.types,
		});
	}, []);

	return {
		// Legacy methods for conversation interface
		lookupSuburb,
		lookupSuburbEnhanced,
		lookupSuburbMultiple,

		// New enhanced methods
		getPlaceSuggestions: getPlaceSuggestionsWithIntent,
		validateFullAddress,

		// Legacy state for conversation interface
		canonicalSuburb,
		enhancedResult,

		// New state
		suggestions,
		detectedIntent,
		isLoading,
		error,

		// Utilities
		reset,
		setResult,
	};
}

export type { LocationIntent };
export { classifyIntent };
