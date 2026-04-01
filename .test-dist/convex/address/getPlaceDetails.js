import { v } from "convex/values";
import { action } from "../_generated/server";
// Field mask for Places API (New) — controls which fields are returned
const GOOGLE_PLACES_FIELD_MASK = "id,formattedAddress,location,addressComponents,types,displayName";
// Helper function to extract specific address components from the response
const extractComponent = (components, type) => {
    const component = components.find((c) => c.types.includes(type));
    return component?.longText;
};
export const getPlaceDetails = action({
    args: { placeId: v.string() },
    returns: v.union(v.object({
        success: v.literal(true),
        details: v.object({
            placeId: v.string(),
            formattedAddress: v.string(),
            lat: v.number(),
            lng: v.number(),
            types: v.array(v.string()),
            postcode: v.optional(v.string()),
            suburb: v.optional(v.string()),
            state: v.optional(v.string()),
        }),
    }), v.object({ success: v.literal(false), error: v.string() })),
    handler: async (ctx, args) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Google Places API key not configured",
            };
        }
        try {
            // Places API (New): GET place by resource name with field mask header
            const url = `https://places.googleapis.com/v1/places/${args.placeId}`;
            const res = await fetch(url, {
                headers: {
                    "X-Goog-Api-Key": apiKey,
                    "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
                },
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errorMsg = errorData.error?.message ||
                    `${res.status} ${res.statusText}`;
                console.error(`[getPlaceDetails] Google Places API error for place ${args.placeId}:`, errorMsg);
                return {
                    success: false,
                    error: `HTTP error: ${errorMsg}`,
                };
            }
            const data = await res.json();
            // Validate essential data
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
            // Extract structured data from the components array
            const postcode = extractComponent(components, "postal_code");
            const suburb = extractComponent(components, "locality");
            const state = extractComponent(components, "administrative_area_level_1");
            const details = {
                placeId: data.id || args.placeId,
                formattedAddress: data.formattedAddress,
                lat: data.location.latitude,
                lng: data.location.longitude,
                types: data.types || [],
                postcode,
                suburb,
                state,
            };
            return { success: true, details };
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error(`[getPlaceDetails] Exception for place ${args.placeId}:`, errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        }
    },
});
