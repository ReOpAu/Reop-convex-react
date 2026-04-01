import type { QueryClient } from "@tanstack/react-query";
import type { Suggestion } from "~/stores/types";
import { type ActionContext, ENRICHMENT_CACHE_KEY } from "./types";

/**
 * Check if a result already has enriched data (postcode, suburb, coordinates).
 */
export const isResultEnriched = (result: Suggestion): boolean => {
	return Boolean(result.postcode && result.suburb && result.lat && result.lng);
};

/**
 * Log enrichment operations for debugging.
 */
export const logEnrichment = (
	operation: string,
	result: Suggestion,
	extra?: Record<string, unknown>,
): void => {
	// Debug logging removed for production cleanliness
};

/**
 * Cached place details result type.
 */
interface CachedPlaceDetails {
	success: boolean;
	details: {
		formattedAddress: string;
		lat: number;
		lng: number;
		types: string[];
		suburb?: string;
		postcode?: string;
	};
}

/**
 * Enrich a suggestion with place details from cache or API.
 * Returns the enriched suggestion or the original if enrichment fails.
 */
export async function enrichSuggestion(
	result: Suggestion,
	queryClient: QueryClient,
	getPlaceDetailsAction: ActionContext["getPlaceDetailsAction"],
	getCurrentSessionToken: ActionContext["getCurrentSessionToken"],
): Promise<Suggestion> {
	// Skip if already enriched or no placeId
	if (!result.placeId) {
		logEnrichment("No placeId, skipping enrichment", result);
		return result;
	}

	if (isResultEnriched(result)) {
		logEnrichment("Already enriched, skipping", result);
		return result;
	}

	logEnrichment("Starting enrichment", result);

	// Check cache first
	const cachedData = queryClient.getQueryData<CachedPlaceDetails>([
		ENRICHMENT_CACHE_KEY,
		result.placeId,
	]);

	if (cachedData?.success) {
		logEnrichment("Using cached data", result);
		return {
			...result,
			description: cachedData.details.formattedAddress,
			displayText: cachedData.details.formattedAddress,
			lat: cachedData.details.lat,
			lng: cachedData.details.lng,
			types: cachedData.details.types,
			suburb: cachedData.details.suburb,
			postcode: cachedData.details.postcode,
		};
	}

	// Fetch fresh data from API
	logEnrichment("Fetching from API", result);
	try {
		const sessionToken = getCurrentSessionToken() ?? undefined;
		const detailsRes = await getPlaceDetailsAction({
			placeId: result.placeId,
			sessionToken,
		});

		if (detailsRes.success && detailsRes.details) {
			logEnrichment("Enrichment successful", result, {
				formattedAddress: detailsRes.details.formattedAddress,
				postcode: detailsRes.details.postcode,
				suburb: detailsRes.details.suburb,
			});

			// Cache the result
			queryClient.setQueryData(
				[ENRICHMENT_CACHE_KEY, result.placeId],
				detailsRes,
			);

			return {
				...result,
				description: detailsRes.details.formattedAddress,
				displayText: detailsRes.details.formattedAddress,
				lat: detailsRes.details.lat,
				lng: detailsRes.details.lng,
				types: detailsRes.details.types,
				suburb: detailsRes.details.suburb,
				postcode: detailsRes.details.postcode,
			};
		}

		// Log enrichment failure but return original result
		logEnrichment("Enrichment failed", result, {
			error: detailsRes.error,
		});
		console.warn(
			`[AddressHandler] Failed to enrich place details for ${result.placeId}:`,
			detailsRes.error,
		);
		return result;
	} catch (error) {
		logEnrichment("Enrichment API call failed", result, { error });
		console.warn(
			`[AddressHandler] Exception during enrichment for ${result.placeId}:`,
			error,
		);
		return result;
	}
}
