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
import type { Suggestion } from "~/stores/types";

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

type PlaceDetails = Extract<GooglePlaceDetailsResult, { success: true }>["details"];

export type AddressSelectionServiceResult =
	| {
			success: true;
			selection: Suggestion;
			details: PlaceDetails;
			validation: GoogleAddressValidationResult;
	  }
	| {
			success: false;
			error: string;
			details?: PlaceDetails;
			validation?: GoogleAddressValidationResult;
	  };

function classifySelectionIntent(
	types: string[],
	description: string,
): Exclude<LocationIntent, "general"> | "general" {
	if (
		types.includes("street_address") ||
		types.includes("premise") ||
		/^(unit\s+|apt\s+|apartment\s+|shop\s+|suite\s+)?\d+[a-z]?([/-]\d+[a-z]?(-\d+[a-z]?)?)?\s+/i.test(
			description.trim(),
		)
	) {
		return "address";
	}

	if (types.includes("route")) {
		return "street";
	}

	if (types.includes("locality") || types.includes("sublocality")) {
		return "suburb";
	}

	return "general";
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

export async function selectAddressService(args: {
	placeId: string;
	description?: string;
	sessionToken?: string;
}): Promise<AddressSelectionServiceResult> {
	const detailsResult = await getPlaceDetailsService({
		placeId: args.placeId,
		sessionToken: args.sessionToken,
	});

	if (!detailsResult.success) {
		return {
			success: false,
			error: detailsResult.error,
		};
	}

	const validation = await validateAddressService({
		address: detailsResult.details.formattedAddress,
	});

	if (!validation.success) {
		return {
			success: false,
			error: validation.error,
			details: detailsResult.details,
			validation,
		};
	}

	const description =
		validation.formattedAddress ??
		detailsResult.details.formattedAddress ??
		args.description ??
		"";

	return {
		success: true,
		selection: {
			description,
			displayText: description,
			placeId: validation.placeId ?? detailsResult.details.placeId,
			lat: validation.location?.latitude ?? detailsResult.details.lat,
			lng: validation.location?.longitude ?? detailsResult.details.lng,
			types: detailsResult.details.types,
			suburb: detailsResult.details.suburb,
			postcode: detailsResult.details.postcode,
			resultType: classifySelectionIntent(
				detailsResult.details.types,
				description,
			),
		},
		details: detailsResult.details,
		validation,
	};
}
