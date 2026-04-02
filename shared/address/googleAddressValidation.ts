import { buildAddressValidationRequest } from "./googleSearch";

export type GoogleAddressValidationResult =
	| {
			success: true;
			isValid: boolean;
			result: any;
			error?: string;
			isRuralException?: boolean;
			validationGranularity?: string;
			formattedAddress?: string;
			placeId?: string;
			location?: {
				latitude: number;
				longitude: number;
			};
	  }
	| {
			success: false;
			error: string;
	  };

function addressLooksRural(address: string): boolean {
	return /hwy|highway|rd|road|lane|track|springmount|mount|creek|farm|station/i.test(
		address,
	);
}

function hasSignificantLocationChange(
	inputAddress: string,
	formattedAddress: string,
): boolean {
	const inputWords = inputAddress
		.toLowerCase()
		.split(/[\s,]+/)
		.filter((word: string) => word.length > 0);
	const outputWords = formattedAddress
		.toLowerCase()
		.split(/[\s,]+/)
		.filter((word: string) => word.length > 0);

	const ignoredAddressTerms = [
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
	];

	const inputHasSuburb = inputWords.some(
		(word: string) =>
			!/^\d+$/.test(word) && !ignoredAddressTerms.includes(word),
	);
	const outputHasSuburb = outputWords.some(
		(word: string) =>
			!/^\d+$/.test(word) &&
			![...ignoredAddressTerms, "australia"].includes(word),
	);

	return !inputHasSuburb && outputHasSuburb;
}

export async function validateAddressWithGoogle({
	address,
	apiKey,
}: {
	address: string;
	apiKey: string;
}): Promise<GoogleAddressValidationResult> {
	try {
		const requestBody = buildAddressValidationRequest(address);
		const response = await fetch(
			`https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			},
		);

		if (!response.ok) {
			return {
				success: false,
				error: `Google API Error: ${response.statusText}`,
			};
		}

		const responseData = await response.json();
		const result = responseData.result;
		if (!result) {
			return {
				success: false,
				error: "Google validation response did not include a result payload",
			};
		}

		const verdict = result.verdict || {};
		const validationGranularity = verdict.validationGranularity || "";
		const formattedAddress = result.address?.formattedAddress;
		const placeId = result.geocode?.placeId;
		const location = result.geocode?.location;
		let isValid = true;
		let validationError = "";
		let isRuralException = false;

		if (!verdict.addressComplete) {
			isValid = false;
			validationError =
				"Address is considered incomplete by the validation service.";
			isRuralException = true;
		} else if (
			["COUNTRY", "ADMINISTRATIVE_AREA", "OTHER"].includes(
				validationGranularity,
			)
		) {
			isValid = false;
			validationError = `Address validation granularity too low: ${validationGranularity} (address is too general)`;
		}

		const hasHouseNumber = /^\d+/.test(address.trim());
		if (isValid && hasHouseNumber) {
			if (
				(validationGranularity === "ROUTE" ||
					validationGranularity === "LOCALITY") &&
				addressLooksRural(address)
			) {
				isValid = false;
				isRuralException = true;
				validationError =
					"This address could not be confirmed at the property level, but appears to be a rural address. You may allow the user to confirm this manually.";
			} else if (validationGranularity === "LOCALITY") {
				isValid = false;
				validationError =
					"House number provided but address only validated to suburb level";
			} else if (
				validationGranularity !== "PREMISE" &&
				validationGranularity !== "SUB_PREMISE"
			) {
				isValid = false;
				validationError = `House number validation insufficient - only validated to ${validationGranularity} level (house number location is estimated, not confirmed)`;
			}
		}

		if (isValid && result.address?.addressComponents) {
			for (const component of result.address.addressComponents) {
				if (component.confirmationLevel === "UNCONFIRMED_AND_SUSPICIOUS") {
					isValid = false;
					validationError = `Address component '${component.componentName?.text}' was suspicious.`;
					break;
				}
			}
		}

		if (
			isValid &&
			formattedAddress &&
			hasSignificantLocationChange(address, formattedAddress)
		) {
			isValid = false;
			validationError =
				"Address appears incomplete - Google auto-completed to a different location. Please provide full address including suburb/city.";
		}

		return {
			success: true,
			isValid,
			result,
			error: validationError || undefined,
			isRuralException: isRuralException || undefined,
			validationGranularity: validationGranularity || undefined,
			formattedAddress,
			placeId,
			location,
		};
	} catch (error) {
		return {
			success: false,
			error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}
