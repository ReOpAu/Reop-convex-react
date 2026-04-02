import { buildAddressValidationRequest } from "./googleSearch";

export type GoogleAddressValidationResult =
	| {
			success: true;
			isValid: boolean;
			result: any;
			error?: string;
	  }
	| {
			success: false;
			error: string;
	  };

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
		const verdict = result.verdict || {};
		let isValid = true;
		let validationError = "";
		const validationGranularity = verdict.validationGranularity || "";

		if (!verdict.addressComplete) {
			isValid = false;
			validationError =
				"Address is considered incomplete by the validation service.";
		} else {
			const hasHouseNumber = /^\d+/.test(address.trim());
			if (hasHouseNumber) {
				if (
					validationGranularity !== "PREMISE" &&
					validationGranularity !== "SUB_PREMISE"
				) {
					isValid = false;
					validationError = `Address validation insufficient. Google could not confirm the exact location of the street number. Granularity: ${validationGranularity}.`;
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
		}

		return {
			success: true,
			isValid,
			result,
			error: validationError || undefined,
		};
	} catch (error) {
		return {
			success: false,
			error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}
