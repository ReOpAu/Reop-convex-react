import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { ConvexListing, Listing, ListingType } from "../types";

interface UseListingsArgs {
	listingType?: ListingType | "all";
	state?: string;
	suburb?: string;
	page?: number;
	pageSize?: number;
}

// Fetch listings with filters (type, state, suburb, pagination)
export function useListings({
	listingType,
	state,
	suburb,
	page = 1,
	pageSize = 12,
}: UseListingsArgs) {
	// Convex query expects filters as args
	const result = useQuery(api.listings.listListings, {
		listingType: listingType === "all" ? undefined : listingType,
		state: state === "all" ? undefined : state,
		suburb: suburb === "all" ? undefined : suburb,
		page,
		pageSize,
	});

	const isLoading = result === undefined;

	return {
		listings: result?.listings || [],
		totalPages: result?.pagination.totalPages || 1,
		totalCount: result?.pagination.totalCount || 0,
		currentPage: result?.pagination.currentPage || page,
		hasNextPage: result?.pagination.hasNextPage || false,
		hasPreviousPage: result?.pagination.hasPreviousPage || false,
		isLoading,
	};
}

// Fetch a single listing by ID
export function useListingById(id: string) {
	return useQuery(api.listings.getListing, { id: id as Id<"listings"> });
}

export function useListingForEdit(id: string) {
	return useQuery(api.listings.getListingForEdit, {
		id: id as Id<"listings">,
	});
}

// Fetch matches for a listing (by ID)
export function useMatchesForListing(listingId: string, options = {}) {
	const result = useQuery(api.matches.findMatches, {
		listingId: listingId as Id<"listings">,
		options,
	});

	// Handle new paginated structure
	if (result && "matches" in result) {
		return {
			matches: result.matches,
			totalCount: result.pagination.totalCount,
			hasMore: result.pagination.hasMore,
			isLoading: false,
		};
	}

	// Handle loading state
	if (result === undefined) {
		return {
			matches: undefined,
			totalCount: 0,
			hasMore: false,
			isLoading: true,
		};
	}

	// Fallback for old structure (backward compatibility)
	return {
		matches: result,
		totalCount: Array.isArray(result) ? (result as any[]).length : 0,
		hasMore: false,
		isLoading: false,
	};
}

// Fetch match details between two specific listings (more efficient than client-side filtering)
export function useMatchDetails(
	originalListingId: string,
	matchedListingId: string,
	includeScoreBreakdown = true,
) {
	return useQuery(api.matches.getMatchDetails, {
		originalListingId: originalListingId as Id<"listings">,
		matchedListingId: matchedListingId as Id<"listings">,
		includeScoreBreakdown,
	});
}

// Mutations for create/update/delete can be added as needed
export function useCreateListing() {
	return useMutation(api.listings.createListing);
}
export function useUpdateListing() {
	return useMutation(api.listings.updateListing);
}
export function useDeleteListing() {
	return useMutation(api.listings.deleteListing);
}
