import type { Doc } from "./_generated/dataModel";

// Public listing visibility Module. This Seam keeps privacy-sensitive fields out
// of every public listing read projection by omission.
export function toPublicListing(listing: Doc<"listings">) {
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

export type PublicListing = ReturnType<typeof toPublicListing>;
