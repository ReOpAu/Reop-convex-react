import { v } from "convex/values";
import { action } from "../_generated/server";
import { classifyLocationIntent, extractSuburbFromPlacesSuggestion, getPlacesApiSuggestions, validateThenEnrichAddress, } from "./utils";
export const getPlaceSuggestions = action({
    args: {
        query: v.string(),
        intent: v.optional(v.union(v.literal("suburb"), v.literal("street"), v.literal("address"), v.literal("general"))),
        maxResults: v.optional(v.number()),
        location: v.optional(v.object({
            lat: v.number(),
            lng: v.number(),
        })),
        radius: v.optional(v.number()),
        isAutocomplete: v.optional(v.boolean()),
        sessionToken: v.optional(v.string()),
    },
    returns: v.union(v.object({
        success: v.literal(true),
        suggestions: v.array(v.object({
            placeId: v.string(),
            description: v.string(),
            types: v.array(v.string()),
            matchedSubstrings: v.array(v.object({
                length: v.number(),
                offset: v.number(),
            })),
            structuredFormatting: v.object({
                mainText: v.string(),
                secondaryText: v.string(),
                main_text: v.optional(v.string()),
                secondary_text: v.optional(v.string()),
                main_text_matched_substrings: v.optional(v.array(v.object({
                    length: v.number(),
                    offset: v.number(),
                }))),
            }),
            resultType: v.union(v.literal("suburb"), v.literal("street"), v.literal("address"), v.literal("general")),
            confidence: v.number(),
            suburb: v.optional(v.string()),
        })),
        detectedIntent: v.union(v.literal("suburb"), v.literal("street"), v.literal("address"), v.literal("general")),
    }), v.object({
        success: v.literal(false),
        error: v.string(),
    })),
    handler: async (ctx, args) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Google Places API key not configured",
            };
        }
        try {
            const query = args.query.trim();
            const clientIntent = args.intent;
            const detectedIntent = clientIntent && clientIntent !== "general"
                ? clientIntent
                : classifyLocationIntent(query);
            const maxResults = args.maxResults || 8;
            // Single-word suburb-first logic
            const isSingleWord = !query.includes(" ");
            if (isSingleWord && detectedIntent === "suburb") {
                const suburbResult = await getPlacesApiSuggestions(query, "suburb", maxResults, apiKey, args.location, args.radius, args.sessionToken);
                if (suburbResult.success && suburbResult.suggestions.length > 0) {
                    return suburbResult;
                }
                return await getPlacesApiSuggestions(query, "street", maxResults, apiKey, args.location, args.radius, args.sessionToken);
            }
            if (detectedIntent === "address" && !args.isAutocomplete) {
                return await validateThenEnrichAddress(query, maxResults, apiKey, args.location);
            }
            if (detectedIntent === "address" && args.isAutocomplete) {
                return await getPlacesApiSuggestions(query, detectedIntent, maxResults, apiKey, args.location, args.radius, args.sessionToken, true);
            }
            return await getPlacesApiSuggestions(query, detectedIntent, maxResults, apiKey, args.location, args.radius, args.sessionToken, args.isAutocomplete);
        }
        catch (error) {
            return {
                success: false,
                error: "Failed to fetch place suggestions",
            };
        }
    },
});
