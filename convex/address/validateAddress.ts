import { v } from "convex/values";
import { action } from "../_generated/server";
import { validateAddressWithGoogle } from "@shared/address/googleAddressValidation";

export const validateAddress = action({
	args: {
		address: v.string(),
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			isValid: v.boolean(),
			result: v.any(),
			error: v.optional(v.string()),
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
		}),
	),
	handler: async (ctx, args) => {
		const apiKey = process.env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}
		return validateAddressWithGoogle({
			address: args.address,
			apiKey,
		});
	},
});
