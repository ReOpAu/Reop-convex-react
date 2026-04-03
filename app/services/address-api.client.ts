import type { GoogleAddressValidationResult } from "@shared/address/googleAddressValidation";
import type { GooglePlaceDetailsResult } from "@shared/address/googlePlaceDetails";
import type { LocationIntent, PlaceSuggestion } from "@shared/types/location";
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

export interface AddressDetailsRequest {
	placeId: string;
	sessionToken?: string;
}

export interface AddressValidationRequest {
	address: string;
}

export interface AddressSelectRequest {
	placeId: string;
	description?: string;
	sessionToken?: string;
}

export type AddressSearchResponse =
	| {
			success: true;
			suggestions: PlaceSuggestion[];
			detectedIntent: LocationIntent;
	  }
	| {
			success: false;
			error: string;
	  };

export type AddressDetailsResponse = GooglePlaceDetailsResult;
export type AddressValidationResponse = GoogleAddressValidationResult;
export type AddressSelectResponse =
	| {
			success: true;
			selection: Suggestion;
			details: Extract<GooglePlaceDetailsResult, { success: true }>["details"];
			validation: GoogleAddressValidationResult;
	  }
	| {
			success: false;
			error: string;
			details?: Extract<GooglePlaceDetailsResult, { success: true }>["details"];
			validation?: GoogleAddressValidationResult;
	  };

function getErrorMessage(
	body: unknown,
	status: number,
	statusText: string,
): string {
	if (
		body &&
		typeof body === "object" &&
		"error" in body &&
		typeof (body as { error: unknown }).error === "string"
	) {
		return (body as { error: string }).error;
	}

	return `Request failed with ${status} ${statusText}`;
}

async function postAddressApi<TResponse>(
	path: string,
	payload: unknown,
): Promise<TResponse> {
	const response = await fetch(path, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(payload),
	});

	const contentType = response.headers.get("content-type") || "";
	if (!contentType.includes("application/json")) {
		const text = await response.text();
		if (!response.ok) {
			throw new Error(text || `Request failed with ${response.status}`);
		}
		throw new Error("Address API returned a non-JSON response");
	}

	const body = (await response.json()) as TResponse;

	if (!response.ok && response.status >= 500) {
		throw new Error(getErrorMessage(body, response.status, response.statusText));
	}

	return body;
}

export function searchAddressApi(
	payload: AddressSearchRequest,
): Promise<AddressSearchResponse> {
	return postAddressApi<AddressSearchResponse>("/api/address/search", payload);
}

export function getPlaceDetailsApi(
	payload: AddressDetailsRequest,
): Promise<AddressDetailsResponse> {
	return postAddressApi<AddressDetailsResponse>("/api/address/details", payload);
}

export function validateAddressApi(
	payload: AddressValidationRequest,
): Promise<AddressValidationResponse> {
	return postAddressApi<AddressValidationResponse>(
		"/api/address/validate",
		payload,
	);
}

export function selectAddressApi(
	payload: AddressSelectRequest,
): Promise<AddressSelectResponse> {
	return postAddressApi<AddressSelectResponse>("/api/address/select", payload);
}
