import { v } from "convex/values";
import ngeohash from "ngeohash";
import { PRICE_OPTIONS } from "../shared/constants/priceOptions";
import { api, internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import { requireAdmin } from "./utils/auth";

// Sample data for clean, realistic listings - expanded variety
const SUBURBS = [
	// NSW Suburbs
	{
		suburb: "Bondi",
		state: "NSW",
		postcode: "2026",
		lat: -33.8908,
		lng: 151.2743,
	},
	{
		suburb: "Edgecliff",
		state: "NSW",
		postcode: "2027",
		lat: -33.87924,
		lng: 151.23614,
	},
	{
		suburb: "Paddington",
		state: "NSW",
		postcode: "2021",
		lat: -33.88416,
		lng: 151.22728,
	},
	{
		suburb: "Double Bay",
		state: "NSW",
		postcode: "2028",
		lat: -33.87664,
		lng: 151.24245,
	},
	{
		suburb: "Potts Point",
		state: "NSW",
		postcode: "2029",
		lat: -33.88151,
		lng: 151.24355,
	},
	// VIC Suburbs
	{
		suburb: "Toorak",
		state: "VIC",
		postcode: "3142",
		lat: -37.8416,
		lng: 145.0176,
	},
	{
		suburb: "Richmond",
		state: "VIC",
		postcode: "3121",
		lat: -37.8204,
		lng: 145.00252,
	},
	{
		suburb: "West Footscray",
		state: "VIC",
		postcode: "3012",
		lat: -37.80174,
		lng: 144.88407,
	},
	{
		suburb: "South Yarra",
		state: "VIC",
		postcode: "3141",
		lat: -37.8389,
		lng: 144.9922,
	},
	{
		suburb: "Hawthorn",
		state: "VIC",
		postcode: "3122",
		lat: -37.82442,
		lng: 145.03172,
	},
	{
		suburb: "Cremorne",
		state: "VIC",
		postcode: "3121",
		lat: -37.8318,
		lng: 144.9938,
	},
	{
		suburb: "Melbourne",
		state: "VIC",
		postcode: "3000",
		lat: -37.81425,
		lng: 144.96317,
	},
	// QLD Suburbs
	{
		suburb: "Paddington",
		state: "QLD",
		postcode: "4064",
		lat: -27.4598,
		lng: 153.0082,
	},
	{
		suburb: "Brisbane",
		state: "QLD",
		postcode: "4000",
		lat: -27.46897,
		lng: 153.0235,
	},
	// Other States
	{
		suburb: "Cottesloe",
		state: "WA",
		postcode: "6011",
		lat: -31.9959,
		lng: 115.7581,
	},
	{
		suburb: "Perth",
		state: "WA",
		postcode: "6000",
		lat: -31.95589,
		lng: 115.86059,
	},
	{
		suburb: "Unley",
		state: "SA",
		postcode: "5061",
		lat: -34.9447,
		lng: 138.6056,
	},
	{
		suburb: "Adelaide",
		state: "SA",
		postcode: "5000",
		lat: -34.92818,
		lng: 138.59993,
	},
];

const BUILDING_TYPES = ["House", "Apartment", "Townhouse", "Villa", "Unit"];

// Features must match the comprehensive Feature enum from types.ts
const FEATURES = [
	"CornerBlock",
	"EnsuiteBathroom",
	"MatureGarden",
	"LockUpGarage",
	"Pool",
	"SolarPanels",
	"RenovatedKitchen",
	"AirConditioning",
	"HighCeilings",
	"WaterViews",
	"StudyRoom",
	"OpenPlanLiving",
	"SecuritySystem",
	"EnergyEfficient",
	"NorthFacing",
	"PetFriendly",
	"WheelchairAccessible",
	"SmartHome",
	"Fireplace",
	"WalkInWardrobe",
	"LanewayAccess",
	"Bungalow",
	"DualLiving",
	"GrannyFlat",
	"HeritageListed",
	"RainwaterTank",
	"DoubleGlazedWindows",
	"HomeTheatre",
	"WineCellar",
	"OutdoorKitchen",
] as const;

type Feature = (typeof FEATURES)[number];

function getRandomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

function randomFeatures(count = 3): Feature[] {
	const shuffled = [...FEATURES].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

function randomPrice(): { min: number; max: number } {
	// Use the exact same price options as the forms for consistency
	const priceValues = PRICE_OPTIONS.map((option) => option.value);

	// Pick random min price from the same options users see in forms
	const minIndex = Math.floor(Math.random() * (priceValues.length - 3)); // Leave room for max
	const min = priceValues[minIndex];

	// Pick max price that's higher than min from the same options
	const maxStartIndex = minIndex + 1 + Math.floor(Math.random() * 3); // 1-3 steps higher
	const maxIndex = Math.min(maxStartIndex, priceValues.length - 1);
	const max = priceValues[maxIndex];

	return { min, max };
}

// Create seed listing mutation
export const createSeedListing = internalMutation({
	args: {
		listing: v.object({
			listingType: v.union(v.literal("buyer"), v.literal("seller")),
			userId: v.id("users"),
			suburb: v.string(),
			state: v.string(),
			postcode: v.string(),
			address: v.optional(v.string()),
			latitude: v.number(),
			longitude: v.number(),
			geohash: v.string(),
			buildingType: v.union(
				v.literal("House"),
				v.literal("Apartment"),
				v.literal("Townhouse"),
				v.literal("Villa"),
				v.literal("Unit"),
			),
			bedrooms: v.number(),
			bathrooms: v.number(),
			parking: v.number(),
			priceMin: v.number(),
			priceMax: v.number(),
			features: v.array(
				v.union(
					v.literal("CornerBlock"),
					v.literal("EnsuiteBathroom"),
					v.literal("MatureGarden"),
					v.literal("LockUpGarage"),
					v.literal("Pool"),
					v.literal("SolarPanels"),
					v.literal("RenovatedKitchen"),
					v.literal("AirConditioning"),
					v.literal("HighCeilings"),
					v.literal("WaterViews"),
					v.literal("StudyRoom"),
					v.literal("OpenPlanLiving"),
					v.literal("SecuritySystem"),
					v.literal("EnergyEfficient"),
					v.literal("NorthFacing"),
					v.literal("PetFriendly"),
					v.literal("WheelchairAccessible"),
					v.literal("SmartHome"),
					v.literal("Fireplace"),
					v.literal("WalkInWardrobe"),
					v.literal("LanewayAccess"),
					v.literal("Bungalow"),
					v.literal("DualLiving"),
					v.literal("GrannyFlat"),
					v.literal("HeritageListed"),
					v.literal("RainwaterTank"),
					v.literal("DoubleGlazedWindows"),
					v.literal("HomeTheatre"),
					v.literal("WineCellar"),
					v.literal("OutdoorKitchen"),
				),
			),
			buyerType: v.optional(v.union(v.literal("street"), v.literal("suburb"))),
			searchRadius: v.optional(v.number()),
			sellerType: v.optional(
				v.union(v.literal("sale"), v.literal("offmarket")),
			),
			headline: v.string(),
			description: v.string(),
			images: v.optional(v.array(v.string())),
			contactEmail: v.optional(v.string()),
			contactPhone: v.optional(v.string()),
			isActive: v.boolean(),
			isPremium: v.optional(v.boolean()),
			sample: v.optional(v.boolean()),
			createdAt: v.number(),
			updatedAt: v.number(),
		}),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("listings", args.listing);
	},
});

// Create seed user
export const createSeedUser = internalMutation({
	args: {
		email: v.string(),
		name: v.string(),
		tokenIdentifier: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("users", {
			email: args.email,
			name: args.name,
			tokenIdentifier: args.tokenIdentifier,
		});
	},
});

// Main seeding action - clean and simple
export const seedListings = action({
	args: {
		userCount: v.optional(v.number()),
		listingCount: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const userCount = args.userCount ?? 10;
		const listingCount = args.listingCount ?? 200;

		// Create users
		const userIds = [];
		for (let i = 0; i < userCount; i++) {
			const userId = await ctx.runMutation(internal.seedListings.createSeedUser, {
				email: `user${i + 1}@example.com`,
				name: `User ${i + 1}`,
				tokenIdentifier: `seed_user_${i + 1}`,
			});
			userIds.push(userId);
		}

		// Create listings with intentional buyer/seller matches (30% pairs + 70% random)
		const matchPairCount = Math.floor(listingCount * 0.15); // 15% become buyer/seller pairs (30% total)
		const randomListingCount = listingCount - matchPairCount * 2;

		// Create intentional buyer/seller matching pairs
		for (let i = 0; i < matchPairCount; i++) {
			const location = getRandomElement(SUBURBS);
			const buildingType = getRandomElement(BUILDING_TYPES);
			const features = randomFeatures(Math.floor(Math.random() * 4) + 2);
			const price = randomPrice();
			const now = Date.now();

			// Base location for the matching pair
			const baseLatVariation = (Math.random() - 0.5) * 0.01;
			const baseLngVariation = (Math.random() - 0.5) * 0.01;
			const baseLat = location.lat + baseLatVariation;
			const baseLng = location.lng + baseLngVariation;

			// Create buyer listing
			const buyerGeohash = ngeohash.encode(baseLat, baseLng, 7);
			const buyerType = Math.random() < 0.6 ? "suburb" : "street";

			await ctx.runMutation(internal.seedListings.createSeedListing, {
				listing: {
					listingType: "buyer" as const,
					userId: getRandomElement(userIds),
					suburb: location.suburb,
					state: location.state,
					postcode: location.postcode,
					latitude: baseLat,
					longitude: baseLng,
					geohash: buyerGeohash,
					buildingType: buildingType as any,
					bedrooms: Math.floor(Math.random() * 4) + 1,
					bathrooms: Math.floor(Math.random() * 3) + 1,
					parking: Math.floor(Math.random() * 3),
					priceMin: price.min,
					priceMax: price.max,
					features,
					buyerType,
					searchRadius:
						buyerType === "street"
							? Math.floor(Math.random() * 5) + 1
							: undefined,
					headline: `Looking for ${buildingType} in ${location.suburb}`,
					description: `Seeking a quality ${buildingType} in ${location.suburb}. Features wanted: ${features.slice(0, 2).join(", ")}.`,
					images: [],
					isActive: true,
					isPremium: Math.random() < 0.2,
					sample: true,
					createdAt: now,
					updatedAt: now,
				},
			});

			// Create matching seller listing (very close location, similar features, overlapping price)
			const sellerLatVariation = (Math.random() - 0.5) * 0.005; // Closer to buyer
			const sellerLngVariation = (Math.random() - 0.5) * 0.005;
			const sellerLat = baseLat + sellerLatVariation;
			const sellerLng = baseLng + sellerLngVariation;
			const sellerGeohash = ngeohash.encode(sellerLat, sellerLng, 7);
			const streetNum = Math.floor(Math.random() * 200) + 1;

			await ctx.runMutation(internal.seedListings.createSeedListing, {
				listing: {
					listingType: "seller" as const,
					userId: getRandomElement(userIds),
					suburb: location.suburb,
					state: location.state,
					postcode: location.postcode,
					address: `${streetNum} Main Street, ${location.suburb} ${location.state} ${location.postcode}`,
					latitude: sellerLat,
					longitude: sellerLng,
					geohash: sellerGeohash,
					buildingType: buildingType as any,
					bedrooms: Math.floor(Math.random() * 4) + 1,
					bathrooms: Math.floor(Math.random() * 3) + 1,
					parking: Math.floor(Math.random() * 3),
					priceMin: price.min, // Same price range for potential match
					priceMax: price.max,
					features, // Same features the buyer wants
					sellerType: Math.random() < 0.8 ? "sale" : "offmarket",
					headline: `Beautiful ${buildingType} in ${location.suburb}`,
					description: `Stunning ${buildingType} for sale in ${location.suburb}. Features: ${features.join(", ")}.`,
					images: [],
					contactEmail: `seller${i}@example.com`,
					contactPhone: `04${Math.floor(Math.random() * 100000000)
						.toString()
						.padStart(8, "0")}`,
					isActive: true,
					isPremium: Math.random() < 0.3,
					sample: true,
					createdAt: now,
					updatedAt: now,
				},
			});
		}

		// Create remaining random listings
		for (let i = 0; i < randomListingCount; i++) {
			const location = getRandomElement(SUBURBS);
			const buildingType = getRandomElement(BUILDING_TYPES);
			const features = randomFeatures(Math.floor(Math.random() * 4) + 2);
			const price = randomPrice();
			const isBuyer = Math.random() < 0.5;
			const now = Date.now();

			const latVariation = (Math.random() - 0.5) * 0.01;
			const lngVariation = (Math.random() - 0.5) * 0.01;
			const lat = location.lat + latVariation;
			const lng = location.lng + lngVariation;
			const geohash = ngeohash.encode(lat, lng, 7);

			const baseListing = {
				listingType: isBuyer ? ("buyer" as const) : ("seller" as const),
				userId: getRandomElement(userIds),
				suburb: location.suburb,
				state: location.state,
				postcode: location.postcode,
				latitude: lat,
				longitude: lng,
				geohash,
				buildingType: buildingType as any,
				bedrooms: Math.floor(Math.random() * 4) + 1,
				bathrooms: Math.floor(Math.random() * 3) + 1,
				parking: Math.floor(Math.random() * 3),
				priceMin: price.min,
				priceMax: price.max,
				features,
				headline: isBuyer
					? `Looking for ${buildingType} in ${location.suburb}`
					: `Beautiful ${buildingType} in ${location.suburb}`,
				description: isBuyer
					? `Seeking a quality ${buildingType} in ${location.suburb}. Features wanted: ${features.slice(0, 2).join(", ")}.`
					: `Stunning ${buildingType} for sale in ${location.suburb}. Features: ${features.join(", ")}.`,
				images: [],
				isActive: true,
				isPremium: Math.random() < 0.2,
				sample: true,
				createdAt: now,
				updatedAt: now,
			};

			if (isBuyer) {
				const buyerType = Math.random() < 0.7 ? "suburb" : "street";
				await ctx.runMutation(internal.seedListings.createSeedListing, {
					listing: {
						...baseListing,
						buyerType,
						searchRadius:
							buyerType === "street"
								? Math.floor(Math.random() * 5) + 1
								: undefined,
					},
				});
			} else {
				const streetNum = Math.floor(Math.random() * 200) + 1;
				await ctx.runMutation(internal.seedListings.createSeedListing, {
					listing: {
						...baseListing,
						address: `${streetNum} Main Street, ${location.suburb} ${location.state} ${location.postcode}`,
						sellerType: Math.random() < 0.8 ? "sale" : "offmarket",
						contactEmail: `seller${i + matchPairCount}@example.com`,
						contactPhone: `04${Math.floor(Math.random() * 100000000)
							.toString()
							.padStart(8, "0")}`,
					},
				});
			}
		}

		return {
			success: true,
			message: `Created ${userCount} users and ${listingCount} listings`,
		};
	},
});

// Cleanup actions
export const deleteSampleData = action({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		// Delete sample listings
		const listings = await ctx.runQuery(api.listings.listListingsAdmin, {
			page: 1,
			pageSize: 10_000,
		});
		let deletedListings = 0;
		for (const listing of listings.listings) {
			if (listing.sample) {
				await ctx.runMutation(api.listings.deleteListing, { id: listing._id });
				deletedListings++;
			}
		}

		// Delete sample users
		const users = await ctx.runQuery(api.users.listAllUsers, {});
		let deletedUsers = 0;
		for (const user of users) {
			if (user.tokenIdentifier.startsWith("seed_user_")) {
				await ctx.runMutation(api.users.deleteUser, { id: user._id });
				deletedUsers++;
			}
		}

		return {
			success: true,
			deletedListings,
			deletedUsers,
		};
	},
});

export const deleteAllListings = action({
	args: {},
	handler: async (
		ctx,
	): Promise<{
		success: boolean;
		message: string;
		deletedListings: number;
	}> => {
		await requireAdmin(ctx);
		const result = await ctx.runMutation(api.listings.clearAllListings, {});
		return {
			success: true,
			message: `Deleted ${result.cleared} listings`,
			deletedListings: result.cleared,
		};
	},
});
