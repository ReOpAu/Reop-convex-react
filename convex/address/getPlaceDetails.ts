import { v } from "convex/values";
import { action } from "../_generated/server";
import { fetchGooglePlaceDetails } from "@shared/address/googlePlaceDetails";

export const getPlaceDetails = action({
	args: {
		placeId: v.string(),
		sessionToken: v.optional(v.string()),
	},
	returns: v.union(
		v.object({
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
		}),
		v.object({ success: v.literal(false), error: v.string() }),
	),
	handler: async (ctx, args) => {
		const apiKey = process.env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}
		return fetchGooglePlaceDetails({
			apiKey,
			placeId: args.placeId,
			sessionToken: args.sessionToken,
		});
	},
});
