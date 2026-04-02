import { z } from "zod";

const locationIntentSchema = z.enum([
	"suburb",
	"street",
	"address",
	"general",
]);

const latLngSchema = z.object({
	lat: z.number().finite(),
	lng: z.number().finite(),
});

export const addressSearchRequestSchema = z.object({
	query: z.string().trim().min(1, "Query is required"),
	intent: locationIntentSchema.optional(),
	maxResults: z.number().int().min(1).max(20).optional(),
	location: latLngSchema.optional(),
	radius: z.number().positive().max(100000).optional(),
	isAutocomplete: z.boolean().optional(),
	sessionToken: z.string().trim().min(1).optional(),
});

export const addressDetailsRequestSchema = z.object({
	placeId: z.string().trim().min(1, "placeId is required"),
	sessionToken: z.string().trim().min(1).optional(),
});

export const addressValidationRequestSchema = z.object({
	address: z.string().trim().min(1, "Address is required"),
});

export const addressSelectRequestSchema = z.object({
	placeId: z.string().trim().min(1, "placeId is required"),
	description: z.string().trim().min(1).optional(),
	sessionToken: z.string().trim().min(1).optional(),
});

export type AddressSearchRequest = z.infer<typeof addressSearchRequestSchema>;
export type AddressDetailsRequest = z.infer<typeof addressDetailsRequestSchema>;
export type AddressValidationRequest = z.infer<
	typeof addressValidationRequestSchema
>;
export type AddressSelectRequest = z.infer<typeof addressSelectRequestSchema>;
