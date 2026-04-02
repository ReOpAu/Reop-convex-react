const GOOGLE_PLACES_FIELD_MASK =
	"id,formattedAddress,location,addressComponents,types,displayName";

interface GoogleAddressComponent {
	longText: string;
	shortText: string;
	types: string[];
	languageCode?: string;
}

interface GooglePlaceDetailsResponse {
	id?: string;
	formattedAddress?: string;
	location?: {
		latitude: number;
		longitude: number;
	};
	addressComponents?: GoogleAddressComponent[];
	types?: string[];
	displayName?: {
		text: string;
		languageCode?: string;
	};
}

function extractComponent(
	components: GoogleAddressComponent[],
	type: string,
): string | undefined {
	const component = components.find((candidate) => candidate.types.includes(type));
	return component?.longText;
}

export type GooglePlaceDetailsResult =
	| {
			success: true;
			details: {
				placeId: string;
				formattedAddress: string;
				lat: number;
				lng: number;
				types: string[];
				postcode?: string;
				suburb?: string;
				state?: string;
			};
	  }
	| {
			success: false;
			error: string;
	  };

export async function fetchGooglePlaceDetails({
	apiKey,
	placeId,
	sessionToken,
}: {
	apiKey: string;
	placeId: string;
	sessionToken?: string;
}): Promise<GooglePlaceDetailsResult> {
	try {
		const url = new URL(`https://places.googleapis.com/v1/places/${placeId}`);
		if (sessionToken) {
			url.searchParams.set("sessionToken", sessionToken);
		}

		const response = await fetch(url.toString(), {
			headers: {
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
			},
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage =
				(errorData as Record<string, any>).error?.message ||
				`${response.status} ${response.statusText}`;
			return {
				success: false,
				error: `HTTP error: ${errorMessage}`,
			};
		}

		const data: GooglePlaceDetailsResponse = await response.json();
		if (!data.formattedAddress) {
			return {
				success: false,
				error: "Missing formattedAddress in response",
			};
		}

		if (!data.location) {
			return {
				success: false,
				error: "Missing location data in response",
			};
		}

		const components = data.addressComponents || [];
		return {
			success: true,
			details: {
				placeId: data.id || placeId,
				formattedAddress: data.formattedAddress,
				lat: data.location.latitude,
				lng: data.location.longitude,
				types: data.types || [],
				postcode: extractComponent(components, "postal_code"),
				suburb: extractComponent(components, "locality"),
				state: extractComponent(components, "administrative_area_level_1"),
			},
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
