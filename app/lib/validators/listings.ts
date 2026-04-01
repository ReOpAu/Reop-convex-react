import { z } from "zod";

export const propertyDetailsSchema = z.object({
	bedrooms: z.number().min(0, "Bedrooms must be 0 or more"),
	bathrooms: z.number().min(0, "Bathrooms must be 0 or more"),
	parkingSpaces: z.number().min(0, "Parking spaces must be 0 or more"),
	landArea: z.number().min(1, "Land area must be greater than 0").optional(),
	floorArea: z.number().min(1, "Floor area must be greater than 0").optional(),
});

export const priceRangeSchema = z
	.object({
		min: z.number().min(0, "Price must be 0 or more"),
		max: z.number().min(0, "Price must be 0 or more"),
	})
	.refine((data) => data.max > data.min, {
		message: "Maximum price must be greater than minimum price",
		path: ["max"],
	});

export const listingFormSchema = z
	.object({
		// Basic listing info
		listingType: z.enum(["buyer", "seller"], {
			error: "Please select whether you are a buyer or seller",
		}),
		subtype: z.enum(["street", "suburb"], {
			error: "Please select listing subtype",
		}),
		headline: z
			.string()
			.min(5, "Headline must be at least 5 characters")
			.max(100, "Headline must be less than 100 characters"),
		description: z
			.string()
			.min(20, "Description must be at least 20 characters")
			.max(1000, "Description must be less than 1000 characters"),

		// Location
		suburb: z.string().min(2, "Suburb is required"),
		state: z.enum(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"], {
			error: "Please select a state",
		}),
		postcode: z.string().regex(/^\d{4}$/, "Postcode must be 4 digits"),
		street: z.string().optional(),

		// Property details
		buildingType: z.string().min(1, "Building type is required"),
		propertyDetails: propertyDetailsSchema,

		// Features
		mustHaveFeatures: z.array(z.string()).optional(),
		niceToHaveFeatures: z.array(z.string()).optional(),
		features: z.array(z.string()).optional(),

		// Price (conditional validation)
		price: priceRangeSchema.optional(),
		pricePreference: priceRangeSchema.optional(),

		// Additional options
		radiusKm: z.number().min(1).max(20).optional(),
		isPremium: z.boolean().optional(),

		// Hidden fields for form processing
		latitude: z.number().optional(),
		longitude: z.number().optional(),
	})
	.refine(
		(data) => {
			// Validate that seller listings have price, buyer listings have pricePreference
			if (data.listingType === "seller" && !data.price) {
				return false;
			}
			if (data.listingType === "buyer" && !data.pricePreference) {
				return false;
			}
			return true;
		},
		{
			message: "Price information is required",
			path: ["price"],
		},
	)
	.refine(
		(data) => {
			// Validate that street buyers have radius
			if (
				data.listingType === "buyer" &&
				data.subtype === "street" &&
				!data.radiusKm
			) {
				return false;
			}
			return true;
		},
		{
			message: "Search radius is required for street buyers",
			path: ["radiusKm"],
		},
	);

export type ListingFormData = z.infer<typeof listingFormSchema>;
