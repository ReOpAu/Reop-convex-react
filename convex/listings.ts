import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
	createListingValidator,
	updateListingValidator,
} from "./schemas/listings/validator";
import {
	getCurrentUser,
	isAdminIdentity,
	requireAdmin,
	requireCurrentUser,
	requireIdentity,
	requireListingOwnerOrAdmin,
} from "./utils/auth";

function sortListingsByNewest(listings: Doc<"listings">[]) {
	return [...listings].sort((a, b) => b.updatedAt - a.updatedAt);
}

function paginate<T>(items: T[], page = 1, pageSize = 12) {
	const totalCount = items.length;
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
	const currentPage = Math.min(Math.max(page, 1), totalPages);
	const startIndex = (currentPage - 1) * pageSize;
	const endIndex = startIndex + pageSize;

	return {
		items: items.slice(startIndex, endIndex),
		pagination: {
			currentPage,
			totalPages,
			totalCount,
			pageSize,
			hasNextPage: currentPage < totalPages,
			hasPreviousPage: currentPage > 1,
		},
	};
}

function normalizeSuburbFilter(suburb: string) {
	return suburb
		.replace(/-/g, " ")
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

function applyListingFilters(
	listings: Doc<"listings">[],
	{
		listingType,
		state,
		suburb,
	}: {
		listingType?: "buyer" | "seller";
		state?: string;
		suburb?: string;
	},
) {
	let results = listings;

	if (listingType) {
		results = results.filter((listing) => listing.listingType === listingType);
	}

	if (state) {
		results = results.filter(
			(listing) => listing.state.toLowerCase() === state.toLowerCase(),
		);
	}

	if (suburb) {
		const normalizedSuburb = normalizeSuburbFilter(suburb);
		results = results.filter(
			(listing) =>
				listing.suburb.toLowerCase() === normalizedSuburb.toLowerCase(),
		);
	}

	return results;
}

function toPublicListing(listing: Doc<"listings">) {
	return {
		_id: listing._id,
		_creationTime: listing._creationTime,
		listingType: listing.listingType,
		suburb: listing.suburb,
		state: listing.state,
		postcode: listing.postcode,
		buildingType: listing.buildingType,
		bedrooms: listing.bedrooms,
		bathrooms: listing.bathrooms,
		parking: listing.parking,
		priceMin: listing.priceMin,
		priceMax: listing.priceMax,
		features: listing.features,
		buyerType: listing.buyerType,
		searchRadius: listing.searchRadius,
		sellerType: listing.sellerType,
		headline: listing.headline,
		description: listing.description,
		images: listing.images,
		isActive: listing.isActive,
		isPremium: listing.isPremium,
		sample: listing.sample,
		createdAt: listing.createdAt,
		updatedAt: listing.updatedAt,
		hasExactLocation: false,
	};
}

export const clearAllListings = mutation({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		const listings = await ctx.db.query("listings").collect();
		for (const listing of listings) {
			await ctx.db.delete(listing._id);
		}
		return { success: true, cleared: listings.length };
	},
});

export const createListing = mutation({
	args: {
		listing: v.object(createListingValidator),
	},
	handler: async (ctx, { listing }) => {
		const user = await requireCurrentUser(ctx);
		const now = Date.now();

		return await ctx.db.insert("listings", {
			...listing,
			userId: user._id,
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const getListing = query({
	args: { id: v.id("listings") },
	handler: async (ctx, { id }) => {
		const listing = await ctx.db.get(id);
		if (!listing || !listing.isActive) {
			return null;
		}

		return toPublicListing(listing);
	},
});

export const getListingForEdit = query({
	args: { id: v.id("listings") },
	handler: async (ctx, { id }) => {
		const listing = await ctx.db.get(id);
		if (!listing) {
			return null;
		}

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		const isAdmin = isAdminIdentity(identity);
		const user = await getCurrentUser(ctx);
		if (!user) {
			return null;
		}

		if (!isAdmin && listing.userId !== user._id) {
			return null;
		}

		return listing;
	},
});

export const updateListing = mutation({
	args: {
		id: v.id("listings"),
		updates: v.object(updateListingValidator),
	},
	handler: async (ctx, { id, updates }) => {
		const listing = await ctx.db.get(id);
		if (!listing) {
			throw new Error("Listing not found");
		}

		await requireListingOwnerOrAdmin(ctx, listing);
		await ctx.db.patch(id, {
			...updates,
			updatedAt: Date.now(),
		});

		return await ctx.db.get(id);
	},
});

export const deleteListing = mutation({
	args: { id: v.id("listings") },
	handler: async (ctx, { id }) => {
		const listing = await ctx.db.get(id);
		if (!listing) {
			throw new Error("Listing not found");
		}

		await requireListingOwnerOrAdmin(ctx, listing);
		await ctx.db.delete(id);
		return { success: true };
	},
});

export const listListings = query({
	args: {
		listingType: v.optional(v.union(v.literal("buyer"), v.literal("seller"))),
		state: v.optional(v.string()),
		suburb: v.optional(v.string()),
		page: v.optional(v.number()),
		pageSize: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ listingType, state, suburb, page = 1, pageSize = 12 },
	) => {
		const allListings = await ctx.db.query("listings").collect();
		const filteredListings = applyListingFilters(
			sortListingsByNewest(
				allListings.filter((listing) => listing.isActive === true),
			),
			{ listingType, state, suburb },
		);
		const { items, pagination } = paginate(filteredListings, page, pageSize);

		return {
			listings: items.map(toPublicListing),
			pagination,
		};
	},
});

export const listMyListings = query({
	args: {
		listingType: v.optional(v.union(v.literal("buyer"), v.literal("seller"))),
		page: v.optional(v.number()),
		pageSize: v.optional(v.number()),
	},
	handler: async (ctx, { listingType, page = 1, pageSize = 24 }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return {
				listings: [],
				pagination: paginate([], page, pageSize).pagination,
			};
		}

		const user = await getCurrentUser(ctx);
		if (!user) {
			return {
				listings: [],
				pagination: paginate([], page, pageSize).pagination,
			};
		}

		const listings = await ctx.db.query("listings").collect();
		const filteredListings = sortListingsByNewest(
			listings.filter(
				(listing) =>
					listing.userId === user._id &&
					(!listingType || listing.listingType === listingType),
			),
		);
		const { items, pagination } = paginate(filteredListings, page, pageSize);

		return {
			listings: items,
			pagination,
		};
	},
});

export const listListingsAdmin = query({
	args: {
		listingType: v.optional(v.union(v.literal("buyer"), v.literal("seller"))),
		state: v.optional(v.string()),
		suburb: v.optional(v.string()),
		page: v.optional(v.number()),
		pageSize: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ listingType, state, suburb, page = 1, pageSize = 20 },
	) => {
		await requireAdmin(ctx);
		const allListings = await ctx.db.query("listings").collect();
		const filteredListings = applyListingFilters(
			sortListingsByNewest(allListings),
			{ listingType, state, suburb },
		);
		const { items, pagination } = paginate(filteredListings, page, pageSize);

		return {
			listings: items,
			pagination,
		};
	},
});

export const getAllListingsDebug = query({
	args: {
		page: v.optional(v.number()),
		pageSize: v.optional(v.number()),
	},
	handler: async (ctx, { page = 1, pageSize = 50 }) => {
		await requireAdmin(ctx);
		const allListings = sortListingsByNewest(await ctx.db.query("listings").collect());
		const { items, pagination } = paginate(allListings, page, pageSize);

		return {
			listings: items.map((listing) => ({
				id: listing._id,
				listingType: listing.listingType,
				state: listing.state,
				suburb: listing.suburb,
				isActive: listing.isActive,
				ownerUserId: listing.userId,
			})),
			pagination,
		};
	},
});

export const saveListing = mutation({
	args: {
		listingId: v.id("listings"),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, { listingId, notes }) => {
		const user = await requireCurrentUser(ctx);

		const existingSave = await ctx.db
			.query("savedListings")
			.withIndex("by_user_and_listing", (q) =>
				q.eq("userId", user._id).eq("listingId", listingId),
			)
			.unique();

		if (existingSave) {
			if (notes !== undefined) {
				await ctx.db.patch(existingSave._id, { notes });
			}
			return { success: true, alreadySaved: true };
		}

		await ctx.db.insert("savedListings", {
			userId: user._id,
			listingId,
			savedAt: Date.now(),
			notes,
		});

		return { success: true, alreadySaved: false };
	},
});

export const unsaveListing = mutation({
	args: { listingId: v.id("listings") },
	handler: async (ctx, { listingId }) => {
		const user = await requireCurrentUser(ctx);
		const savedListing = await ctx.db
			.query("savedListings")
			.withIndex("by_user_and_listing", (q) =>
				q.eq("userId", user._id).eq("listingId", listingId),
			)
			.unique();

		if (savedListing) {
			await ctx.db.delete(savedListing._id);
			return { success: true, wasRemoved: true };
		}

		return { success: true, wasRemoved: false };
	},
});

export const isListingSaved = query({
	args: { listingId: v.id("listings") },
	handler: async (ctx, { listingId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return false;
		}

		const user = await getCurrentUser(ctx);
		if (!user) {
			return false;
		}

		const savedListing = await ctx.db
			.query("savedListings")
			.withIndex("by_user_and_listing", (q) =>
				q.eq("userId", user._id).eq("listingId", listingId),
			)
			.unique();

		return savedListing !== null;
	},
});

export const getUserSavedListings = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return [];
		}

		const user = await getCurrentUser(ctx);
		if (!user) {
			return [];
		}

		const savedListings = await ctx.db
			.query("savedListings")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();

		const listingsWithDetails = await Promise.all(
			savedListings.map(async (saved) => {
				const listing = await ctx.db.get(saved.listingId);
				return listing
					? {
							...saved,
							listing: toPublicListing(listing),
						}
					: null;
			}),
		);

		return listingsWithDetails.filter((item) => item !== null);
	},
});

export const getStateListingStats = query({
	args: { state: v.string() },
	handler: async (ctx, { state }) => {
		const allListings = await ctx.db.query("listings").collect();
		const stateListings = allListings.filter(
			(listing) =>
				listing.isActive === true &&
				listing.state.toLowerCase() === state.toLowerCase(),
		);

		return {
			totalListings: stateListings.length,
			buyerListings: stateListings.filter((l) => l.listingType === "buyer")
				.length,
			sellerListings: stateListings.filter((l) => l.listingType === "seller")
				.length,
		};
	},
});

async function getActiveListings(ctx: QueryCtx) {
	const listings = await ctx.db.query("listings").collect();
	return listings.filter((listing) => listing.isActive === true);
}

// Get available suburbs for a given state
export const getSuburbsByState = query({
	args: { state: v.string() },
	handler: async (ctx, { state }) => {
		if (!state || state.trim().length === 0) {
			throw new Error("State parameter is required");
		}

		const normalizedState = state.trim().toLowerCase();
		const listings = await getActiveListings(ctx);
		const suburbs = [
			...new Set(
				listings
					.filter((listing) => listing.state.toLowerCase() === normalizedState)
					.map((listing) => listing.suburb)
					.filter(Boolean),
			),
		].sort();

		return suburbs;
	},
});

// Get available states that have active listings
export const getAvailableStates = query({
	args: {},
	handler: async (ctx) => {
		const listings = await getActiveListings(ctx);
		const states = [
			...new Set(
				listings
					.map((listing) => listing.state)
					.filter(Boolean),
			),
		].sort();

		return states;
	},
});
