import { v } from "convex/values";
import { action } from "../_generated/server";
export const validateAddress = action({
    args: {
        address: v.string(),
    },
    returns: v.union(v.object({
        success: v.literal(true),
        isValid: v.boolean(),
        result: v.any(),
        error: v.optional(v.string()),
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
            const requestBody = { address: { addressLines: [args.address] } };
            const response = await fetch(`https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorBody = await response.text();
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
            }
            else {
                const hasHouseNumber = /^\d+/.test(args.address.trim());
                if (hasHouseNumber) {
                    if (validationGranularity !== "PREMISE" &&
                        validationGranularity !== "SUB_PREMISE") {
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
                isValid: isValid,
                result,
                error: validationError || undefined,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
