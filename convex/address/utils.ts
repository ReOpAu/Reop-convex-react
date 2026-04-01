// Shared helpers for address-related Convex actions
// (Moved from location.ts)

import type { LocationIntent, PlaceSuggestion } from "@shared/types/location";

// Re-export the canonical implementation
export { classifyLocationIntent } from "@shared/utils/intentClassification";

export function buildAddressValidationRequest(address: string) {
	return {
		address: {
			regionCode: "AU",
			addressLines: [address],
		},
		enableUspsCass: false,
	};
}

// Helper to clean suburb strings
function cleanSuburbString(str: string): string {
	return str
		.replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}?/i, "")
		.replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)$/i, "")
		.replace(/\s+\d{4}$/, "")
		.trim();
}

// --- extractSuburbFromPlacesSuggestion ---
export function extractSuburbFromPlacesSuggestion(
	suggestion: PlaceSuggestion,
): string | undefined {
	if (
		suggestion.resultType === "suburb" &&
		suggestion.structuredFormatting.mainText
	) {
		return suggestion.structuredFormatting.mainText.trim();
	}
	if (suggestion.structuredFormatting.secondaryText) {
		const secondaryText = suggestion.structuredFormatting.secondaryText;
		const parts = secondaryText.split(",").map((part) => part.trim());
		if (parts.length > 0) {
			const firstPart = parts[0];
			const suburb = cleanSuburbString(firstPart);
			if (suburb) {
				return suburb;
			}
		}
	}
	if (suggestion.description) {
		const parts = suggestion.description.split(",").map((part) => part.trim());
		let potentialSuburbPart: string | undefined;
		if (
			suggestion.types.includes("street_address") ||
			suggestion.types.includes("premise")
		) {
			if (parts.length >= 2) {
				potentialSuburbPart = parts[1];
			}
		} else {
			if (parts.length > 0) {
				potentialSuburbPart = parts[0];
			}
		}
		if (potentialSuburbPart) {
			const suburb = cleanSuburbString(potentialSuburbPart);
			if (suburb && suburb.length > 0 && suburb.toLowerCase() !== "australia") {
				return suburb;
			}
		}
	}
	return undefined;
}

// --- getPlacesApiSuggestions ---
function classifyResultType(
	types: string[],
	description: string,
): "suburb" | "street" | "address" | "general" {
	if (
		types.includes("street_address") ||
		types.includes("premise") ||
		/^\d+/.test(description)
	) {
		return "address";
	}
	if (
		types.includes("route") ||
		/\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|crescent|cres|court|ct|place|pl)\b/i.test(
			description,
		)
	) {
		return "street";
	}
	if (
		types.includes("locality") ||
		types.includes("sublocality") ||
		types.includes("administrative_area_level_2")
	) {
		return "suburb";
	}
	return "general";
}

function calculateConfidence(
	prediction: any,
	detectedIntent: LocationIntent,
	resultType: "suburb" | "street" | "address" | "general",
	searchQuery?: string,
	position?: number,
): number {
	// === SOPHISTICATED CONFIDENCE SCORING SYSTEM ===
	// Leverages all available Google Places API data for optimal user experience

	// 1. DYNAMIC BASE SCORE - Google's ranking indicates relevance
	// First result gets highest base score, decreasing for subsequent results
	let confidence =
		position !== undefined
			? Math.max(0.6 - position * 0.08, 0.25) // 60% -> 52% -> 44% -> 36% -> 28%
			: 0.4; // Default if position unknown

	// 2. INTENT ALIGNMENT SCORING (Primary Factor: +35%)
	// Strong bonus for results that match what user is looking for
	if (doesResultMatchIntent(resultType, detectedIntent)) {
		confidence += 0.35;

		// Extra precision bonus for exact Google Places type alignment
		if (
			(detectedIntent === "suburb" && prediction.types.includes("locality")) ||
			(detectedIntent === "street" && prediction.types.includes("route")) ||
			(detectedIntent === "address" &&
				prediction.types.includes("street_address"))
		) {
			confidence += 0.15; // Total +50% for perfect alignment
		}
	} else {
		// Moderate penalty for intent mismatch, but not too harsh
		confidence -= 0.1;
	}

	// 3. QUERY SIMILARITY ANALYSIS (+20% max)
	// Measures how well the result description matches the user's input
	if (searchQuery && prediction.description) {
		const similarity = calculateStringSimilarity(
			searchQuery.toLowerCase().trim(),
			prediction.description.toLowerCase(),
		);
		confidence += similarity * 0.2;
	}

	// 4. AUSTRALIAN GEOLOCATION RELEVANCE (+15%)
	// Enhanced detection of Australian address patterns
	const australianRelevance = calculateAustralianRelevance(
		prediction.description,
	);
	confidence += australianRelevance * 0.15;

	// 5. GOOGLE PLACES QUALITY INDICATORS (+10%)
	// Leverage Google's internal quality signals
	const qualityScore = calculateGoogleQualityScore(prediction);
	confidence += qualityScore * 0.1;

	// 6. STRUCTURED FORMATTING BONUS (+8%)
	// Well-formatted results from Google are typically more reliable
	if (prediction.structured_formatting) {
		const mainText = prediction.structured_formatting.main_text || "";
		const secondaryText = prediction.structured_formatting.secondary_text || "";

		// Bonus for having both main and secondary text (complete address formatting)
		if (mainText.length > 0 && secondaryText.length > 0) {
			confidence += 0.08;
		} else if (mainText.length > 0) {
			confidence += 0.04;
		}
	}

	// 7. ESTABLISHMENT RELEVANCE ADJUSTMENT (-15% to +5%)
	// Smart penalty/bonus based on whether establishments are relevant to the intent
	const establishmentScore = calculateEstablishmentRelevance(
		prediction.types,
		detectedIntent,
	);
	confidence += establishmentScore;

	// 8. MATCHED SUBSTRINGS PRECISION (+5%)
	// Google provides match highlighting - use this signal
	if (
		prediction.matched_substrings &&
		prediction.matched_substrings.length > 0
	) {
		const totalMatched = prediction.matched_substrings.reduce(
			(sum: number, match: any) => sum + match.length,
			0,
		);
		const matchRatio = Math.min(totalMatched / (searchQuery?.length || 1), 1);
		confidence += matchRatio * 0.05;
	}

	// 9. ADDRESS COMPLETENESS FACTOR (+3%)
	// More complete addresses are generally more reliable
	const completeness = calculateAddressCompleteness(prediction.description);
	confidence += completeness * 0.03;

	// 10. FINAL BOUNDS AND NORMALIZATION
	// Ensure confidence stays within valid bounds
	return Math.max(0.05, Math.min(0.98, confidence));
}

// === HELPER FUNCTIONS FOR SOPHISTICATED SCORING ===

function calculateStringSimilarity(query: string, result: string): number {
	// Simple but effective similarity using common substring ratio
	if (!query || !result) return 0;

	const queryWords = query.split(/\s+/).filter((w) => w.length > 0);
	const resultLower = result.toLowerCase();

	let matchedWords = 0;
	for (const word of queryWords) {
		if (resultLower.includes(word.toLowerCase())) {
			matchedWords++;
		}
	}

	return queryWords.length > 0 ? matchedWords / queryWords.length : 0;
}

function calculateAustralianRelevance(description: string): number {
	let relevance = 0;

	// Australian state codes (strong signal)
	if (/(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(description)) {
		relevance += 0.4;
	}

	// Australian postcodes (4 digits, not starting with 0)
	if (/\b[1-9]\d{3}\b/.test(description)) {
		relevance += 0.3;
	}

	// Australia country reference
	if (/\bAustralia\b/i.test(description)) {
		relevance += 0.2;
	}

	// Common Australian address terms
	if (
		/(Street|Road|Avenue|Lane|Drive|Court|Place|Terrace|Crescent|Circuit)\b/i.test(
			description,
		)
	) {
		relevance += 0.1;
	}

	return Math.min(relevance, 1.0);
}

function calculateGoogleQualityScore(prediction: any): number {
	let quality = 0;

	// Multiple types indicate richer data
	if (prediction.types && prediction.types.length > 1) {
		quality += 0.3;
	}

	// Presence of place_id indicates verified place
	if (prediction.place_id && prediction.place_id.length > 10) {
		quality += 0.4;
	}

	// Well-structured description format
	if (prediction.description && prediction.description.includes(",")) {
		quality += 0.3;
	}

	return Math.min(quality, 1.0);
}

function calculateEstablishmentRelevance(
	types: string[],
	intent: LocationIntent,
): number {
	if (!types || !Array.isArray(types)) return 0;

	const establishmentTypes = [
		"restaurant",
		"gas_station",
		"hospital",
		"school",
		"shopping_mall",
		"store",
		"point_of_interest",
		"tourist_attraction",
		"bank",
		"pharmacy",
	];

	const geographicTypes = [
		"locality",
		"sublocality",
		"route",
		"street_address",
		"administrative_area_level_1",
		"administrative_area_level_2",
	];

	const hasEstablishment = types.some((type) =>
		establishmentTypes.includes(type),
	);
	const hasGeographic = types.some((type) => geographicTypes.includes(type));

	// For suburb/street/address intents, geographic types are preferred
	if (intent !== "general" && intent !== null) {
		if (hasGeographic && !hasEstablishment) {
			return 0.05; // Pure geographic - good
		} else if (hasGeographic && hasEstablishment) {
			return 0; // Mixed - neutral
		} else if (hasEstablishment) {
			return -0.15; // Pure establishment - penalty
		}
	}

	// For general intent, establishments can be relevant
	if (intent === "general" && hasEstablishment) {
		return 0.02; // Small bonus for general searches
	}

	return 0;
}

function calculateAddressCompleteness(description: string): number {
	if (!description) return 0;

	let completeness = 0;
	const parts = description.split(",").map((p) => p.trim());

	// More comma-separated parts indicate more complete address
	completeness += Math.min(parts.length * 0.2, 0.6);

	// Presence of numbers (house numbers, postcodes)
	if (/\d/.test(description)) {
		completeness += 0.2;
	}

	// Reasonable length indicates detailed description
	if (description.length > 20 && description.length < 100) {
		completeness += 0.2;
	}

	return Math.min(completeness, 1.0);
}

function doesResultMatchIntent(
	resultType: "suburb" | "street" | "address" | "general",
	intent: LocationIntent,
): boolean {
	switch (intent) {
		case "suburb":
			return resultType === "suburb";
		case "street":
			return resultType === "street";
		case "address":
			return resultType === "address";
		case "general":
			return true;
		default:
			return false;
	}
}

function shouldIncludeResult(
	prediction: any,
	intent: LocationIntent,
	strictness: string,
): boolean {
	const description = prediction.description.toLowerCase();
	const types = prediction.types;
	// Geographic filtering removed — includedRegionCodes: ["au"] in the API
	// request already constrains results to Australia, and
	// calculateAustralianRelevance() handles ranking via confidence scoring.
	const unwantedTypes = [
		"establishment",
		"point_of_interest",
		"store",
		"food",
		"restaurant",
		"gas_station",
		"hospital",
		"school",
		"shopping_mall",
		"university",
		"bank",
		"pharmacy",
		"gym",
		"beauty_salon",
		"car_dealer",
		"real_estate_agency",
		"lawyer",
		"dentist",
		"doctor",
		"tourist_attraction",
		"park",
		"amusement_park",
		"zoo",
		"museum",
		"art_gallery",
		"aquarium",
		"casino",
		"natural_feature",
		"hiking_area",
		"camping_cabin",
		"campground",
		"national_park",
		"state_park",
		"botanical_garden",
		"beach",
		"mountain_peak",
		"lake",
		"river",
		"waterfall",
		"trail",
		"movie_theater",
		"bowling_alley",
		"night_club",
		"bar",
		"stadium",
		"sports_complex",
		"golf_course",
		"ski_resort",
		"marina",
		"water_park",
		"theme_park",
		"transit_station",
		"airport",
		"bus_station",
		"train_station",
		"subway_station",
		"walking_track",
		"hiking_trail",
		"nature_trail",
		"walking_path",
		"pedestrian_path",
		"bike_path",
		"cycling_path",
		"trail_head",
		"playground",
		"picnic_ground",
		"observation_deck",
		"lookout",
		"scenic_lookout",
		"visitor_center",
		"information_center",
	];
	const hasUnwantedType = types.some((type: string) =>
		unwantedTypes.includes(type),
	);
	const unwantedKeywords = [
		"tunnel",
		"bridge",
		"mall",
		"centre",
		"center",
		"station",
		"hospital",
		"school",
		"university",
		"airport",
		"port",
		"wharf",
		"pier",
		"marina",
		"golf",
		"club",
		"hotel",
		"motel",
		"plaza",
		"depot",
		"terminal",
		"walk",
		"trail",
		"track",
		"path",
		"falls",
		"waterfall",
		"lookout",
		"reserve",
		"park",
		"garden",
		"beach",
		"creek",
		"river",
		"lake",
		"mountain",
		"hill",
		"valley",
		"gorge",
		"scenic",
		"viewpoint",
		"camping",
		"campground",
		"caravan",
		"picnic",
		"bbq",
		"playground",
	];
	const hasUnwantedKeyword = unwantedKeywords.some((keyword) =>
		description.includes(keyword),
	);
	if (strictness === "high") {
		if (intent === "suburb") {
			const isGenuineSuburb = types.some((type: string) =>
				["locality", "sublocality", "administrative_area_level_2"].includes(
					type,
				),
			);
			return isGenuineSuburb && !hasUnwantedType;
		}
	}
	return !hasUnwantedType;
}

export async function getPlacesApiSuggestions(
	query: string,
	actualIntent: LocationIntent,
	maxResults: number,
	apiKey: string,
	location?: { lat: number; lng: number },
	radius?: number,
	sessionToken?: string,
	isAutocomplete?: boolean,
): Promise<
	| {
			success: true;
			suggestions: PlaceSuggestion[];
			detectedIntent: LocationIntent;
	  }
	| { success: false; error: string }
> {
	const getStrictness = (intent: LocationIntent): string => {
		switch (intent) {
			case "suburb":
				return "high";
			case "street":
				return "medium";
			case "address":
				return "low";
			default:
				return "medium";
		}
	};
	const config = { strictness: getStrictness(actualIntent) };
	const suggestions: PlaceSuggestion[] = [];

	// Build request body for Places API (New)
	const requestBody: Record<string, unknown> = {
		input: query,
		includedRegionCodes: ["au"],
	};
	if (sessionToken) {
		requestBody.sessionToken = sessionToken;
	}
	if (location) {
		requestBody.locationBias = {
			circle: {
				center: { latitude: location.lat, longitude: location.lng },
				radius: radius || 50000,
			},
		};
	}

	const response = await fetch(
		"https://places.googleapis.com/v1/places:autocomplete",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": apiKey,
			},
			body: JSON.stringify(requestBody),
		},
	);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		const errorMsg = (errorData as Record<string, any>).error?.message;
		return {
			success: false as const,
			error: `Google Places API error: ${response.status}${errorMsg ? ` — ${errorMsg}` : ""}`,
		};
	}

	const data = await response.json();

	// Transform new API suggestions to legacy prediction format
	// so existing scoring/filtering functions work unchanged
	const convertMatches = (
		matches?: Array<{ startOffset?: number; endOffset?: number }>,
	) =>
		(matches || []).map((m) => ({
			offset: m.startOffset || 0,
			length: (m.endOffset || 0) - (m.startOffset || 0),
		}));

	const predictions = ((data as Record<string, any>).suggestions || [])
		.filter((s: any) => s.placePrediction)
		.map((s: any) => {
			const pp = s.placePrediction;
			return {
				place_id: pp.placeId,
				description: pp.text?.text || "",
				types: pp.types || [],
				matched_substrings: convertMatches(pp.text?.matches),
				structured_formatting: {
					main_text: pp.structuredFormat?.mainText?.text || "",
					secondary_text: pp.structuredFormat?.secondaryText?.text || "",
					main_text_matched_substrings: convertMatches(
						pp.structuredFormat?.mainText?.matches,
					),
				},
			};
		});

	for (let i = 0; i < predictions.length; i++) {
		const prediction = predictions[i];
		const resultType = classifyResultType(
			prediction.types,
			prediction.description,
		);
		const confidence = calculateConfidence(
			prediction,
			actualIntent,
			resultType,
			query,
			i,
		);
		if (shouldIncludeResult(prediction, actualIntent, config.strictness)) {
			const tempSuggestion: PlaceSuggestion = {
				placeId: prediction.place_id,
				description: prediction.description,
				types: prediction.types,
				matchedSubstrings: prediction.matched_substrings || [],
				structuredFormatting: {
					mainText:
						prediction.structured_formatting?.main_text ||
						prediction.description.split(",")[0],
					secondaryText:
						prediction.structured_formatting?.secondary_text ||
						prediction.description.split(",").slice(1).join(",").trim(),
					main_text: prediction.structured_formatting?.main_text,
					secondary_text: prediction.structured_formatting?.secondary_text,
					main_text_matched_substrings:
						prediction.structured_formatting?.main_text_matched_substrings,
				},
				resultType,
				confidence,
			};
			const extractedSuburb = extractSuburbFromPlacesSuggestion(tempSuggestion);
			suggestions.push({
				...tempSuggestion,
				suburb: extractedSuburb,
			});
			if (suggestions.length >= maxResults) {
				break;
			}
		}
	}
	const sortedSuggestions = suggestions
		.sort((a, b) => {
			const aMatchesIntent = doesResultMatchIntent(a.resultType, actualIntent);
			const bMatchesIntent = doesResultMatchIntent(b.resultType, actualIntent);
			if (aMatchesIntent && !bMatchesIntent) return -1;
			if (!aMatchesIntent && bMatchesIntent) return 1;
			return b.confidence - a.confidence;
		})
		.slice(0, maxResults);

	// Intent-matching results are already ranked first by the sort above (lines
	// 659-667) and confidence scoring handles relevance. Strict post-sort
	// filtering was silently discarding valid results when Google's type
	// classification didn't match our classifyResultType(). Return the
	// intent-ranked list directly so non-matching-but-valid results appear at the
	// bottom rather than being deleted.
	return {
		success: true,
		suggestions: sortedSuggestions,
		detectedIntent: actualIntent,
	};
}

// --- validateThenEnrichAddress ---
async function validateAddressOnly(
	address: string,
	apiKey: string,
): Promise<{
	isValid: boolean;
	formattedAddress?: string;
	error?: string;
	placeId?: string;
	isRuralException?: boolean;
	validationGranularity?: string;
}> {
	const requestBody = buildAddressValidationRequest(address);
	const response = await fetch(
		`https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		},
	);
	if (!response.ok) {
		return {
			isValid: false,
			error: `Address Validation API error: ${response.status}`,
		};
	}
	const data = await response.json();
	if (!data.result || !data.result.address) {
		return {
			isValid: false,
			error: "Address not found or invalid",
		};
	}
	const result = data.result;
	const verdict = result.verdict || {};
	const addressComplete = verdict.addressComplete || false;
	const validationGranularity = verdict.validationGranularity || "";
	if (!addressComplete) {
		return {
			isValid: false,
			error: "Address is considered incomplete by the validation service.",
			isRuralException: true,
			validationGranularity,
			formattedAddress: result.address?.formattedAddress,
			placeId: result.geocode?.placeId || "",
		};
	}
	const unacceptableGranularities = ["COUNTRY", "ADMINISTRATIVE_AREA", "OTHER"];
	if (unacceptableGranularities.includes(validationGranularity)) {
		return {
			isValid: false,
			error: `Address validation granularity too low: ${validationGranularity} (address is too general)`,
		};
	}
	const hasHouseNumber = /^\d+/.test(address.trim());
	function addressLooksRural(address: string): boolean {
		return /hwy|highway|rd|road|lane|track|springmount|mount|creek|farm|station/i.test(
			address,
		);
	}
	if (hasHouseNumber) {
		if (
			(validationGranularity === "ROUTE" ||
				validationGranularity === "LOCALITY") &&
			addressLooksRural(address)
		) {
			return {
				isValid: false,
				error:
					"This address could not be confirmed at the property level, but appears to be a rural address. You may allow the user to confirm this manually.",
				isRuralException: true,
				validationGranularity,
				formattedAddress: result.address?.formattedAddress,
				placeId: result.geocode?.placeId || "",
			};
		}
		if (validationGranularity === "LOCALITY") {
			return {
				isValid: false,
				error:
					"House number provided but address only validated to suburb level",
			};
		}
		if (
			validationGranularity !== "PREMISE" &&
			validationGranularity !== "SUB_PREMISE"
		) {
			return {
				isValid: false,
				error: `House number validation insufficient - only validated to ${validationGranularity} level (house number location is estimated, not confirmed)`,
			};
		}
		if (result.address?.addressComponents) {
			for (const component of result.address.addressComponents) {
				if (component.confirmationLevel === "UNCONFIRMED_AND_SUSPICIOUS") {
					return {
						isValid: false,
						error: `Address component '${component.componentName?.text}' was suspicious.`,
					};
				}
			}
		}
	}
	const formattedAddress = result.address.formattedAddress;
	const inputWords = address
		.toLowerCase()
		.split(/[\s,]+/)
		.filter((w: string) => w.length > 0);
	const outputWords = formattedAddress
		.toLowerCase()
		.split(/[\s,]+/)
		.filter((w: string) => w.length > 0);
	const hasSignificantLocationChange = () => {
		const inputHasSuburb = inputWords.some(
			(w: string) =>
				!w.match(/^\d+$/) &&
				![
					"st",
					"street",
					"rd",
					"road",
					"ave",
					"avenue",
					"ln",
					"lane",
					"dr",
					"drive",
				].includes(w),
		);
		const outputHasSuburb = outputWords.some(
			(w: string) =>
				!w.match(/^\d+$/) &&
				![
					"st",
					"street",
					"rd",
					"road",
					"ave",
					"avenue",
					"ln",
					"lane",
					"dr",
					"drive",
					"australia",
				].includes(w),
		);
		if (!inputHasSuburb && outputHasSuburb) {
			return true;
		}
		return false;
	};
	if (hasSignificantLocationChange()) {
		return {
			isValid: false,
			error:
				"Address appears incomplete - Google auto-completed to a different location. Please provide full address including suburb/city.",
		};
	}
	return {
		isValid: true,
		formattedAddress: result.address.formattedAddress,
		placeId: result.geocode?.placeId,
	};
}

export async function validateThenEnrichAddress(
	query: string,
	maxResults: number,
	apiKey: string,
	location?: { lat: number; lng: number },
): Promise<
	| {
			success: true;
			suggestions: PlaceSuggestion[];
			detectedIntent: LocationIntent;
	  }
	| { success: false; error: string }
> {
	const validationResult = await validateAddressOnly(query, apiKey);
	if (!validationResult.isValid) {
		return {
			success: false,
			error: `Address validation failed: ${validationResult.error || "Address does not exist or is invalid"}`,
		};
	}
	const placesResult = await getPlacesApiSuggestions(
		validationResult.formattedAddress || query,
		"address",
		maxResults,
		apiKey,
		location,
	);
	if (placesResult.success) {
		const enhancedSuggestions = placesResult.suggestions.map((suggestion) => {
			const extractedSuburb = extractSuburbFromPlacesSuggestion(suggestion);
			return {
				...suggestion,
				confidence: Math.min(1, suggestion.confidence + 0.2),
				types: [...suggestion.types, "address_validated"],
				resultType: "address" as const,
				suburb: extractedSuburb,
			};
		});
		return {
			success: true,
			suggestions: enhancedSuggestions,
			detectedIntent: "address",
		};
	}
	return {
		success: false,
		error: placesResult.error || "Unknown error during enrichment",
	};
}
