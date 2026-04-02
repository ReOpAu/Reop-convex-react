import type { LocationIntent } from "@shared/types/location";
import { classifyLocationIntent } from "@shared/utils/intentClassification";
import {
	getPlacesApiSuggestions,
	validateThenEnrichAddress,
} from "@shared/address/googleSearch";
import {
	fetchGooglePlaceDetails,
	type GooglePlaceDetailsResult,
} from "@shared/address/googlePlaceDetails";
import {
	validateAddressWithGoogle,
	type GoogleAddressValidationResult,
} from "@shared/address/googleAddressValidation";

export interface AddressSearchRequest {
	query: string;
	intent?: LocationIntent;
	maxResults?: number;
	location?: {
		lat: number;
		lng: number;
	};
	radius?: number;
	isAutocomplete?: boolean;
	sessionToken?: string;
}

function getGoogleMapsApiKey() {
	const apiKey = process.env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) {
		throw new Error("GOOGLE_MAPS_API_KEY is not configured");
	}
	return apiKey;
}

export async function getPlaceSuggestionsService(args: AddressSearchRequest) {
	const apiKey = getGoogleMapsApiKey();
	const query = args.query.trim();
	const detectedIntent =
		args.intent && args.intent !== "general"
			? args.intent
			: classifyLocationIntent(query);
	const maxResults = args.maxResults || 8;
	const isSingleWord = !query.includes(" ");

	if (isSingleWord && detectedIntent === "suburb") {
		const suburbResult = await getPlacesApiSuggestions(
			query,
			"suburb",
			maxResults,
			apiKey,
			args.location,
			args.radius,
			args.sessionToken,
		);
		if (suburbResult.success && suburbResult.suggestions.length > 0) {
			return suburbResult;
		}

		return getPlacesApiSuggestions(
			query,
			"street",
			maxResults,
			apiKey,
			args.location,
			args.radius,
			args.sessionToken,
		);
	}

	if (detectedIntent === "address" && !args.isAutocomplete) {
		return validateThenEnrichAddress(query, maxResults, apiKey, args.location);
	}

	if (detectedIntent === "address" && args.isAutocomplete) {
		return getPlacesApiSuggestions(
			query,
			detectedIntent,
			maxResults,
			apiKey,
			args.location,
			args.radius,
			args.sessionToken,
			true,
		);
	}

	return getPlacesApiSuggestions(
		query,
		detectedIntent,
		maxResults,
		apiKey,
		args.location,
		args.radius,
		args.sessionToken,
		args.isAutocomplete,
	);
}

export async function getPlaceDetailsService(args: {
	placeId: string;
	sessionToken?: string;
}): Promise<GooglePlaceDetailsResult> {
	return fetchGooglePlaceDetails({
		apiKey: getGoogleMapsApiKey(),
		placeId: args.placeId,
		sessionToken: args.sessionToken,
	});
}

export async function validateAddressService(args: {
	address: string;
}): Promise<GoogleAddressValidationResult> {
	return validateAddressWithGoogle({
		address: args.address,
		apiKey: getGoogleMapsApiKey(),
	});
}
