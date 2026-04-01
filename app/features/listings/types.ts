// Clean Schema Types - aligned with Convex schema

import type { Doc } from "convex/_generated/dataModel";

export type ListingType = "buyer" | "seller";
export type BuildingType =
	| "House"
	| "Apartment"
	| "Townhouse"
	| "Villa"
	| "Unit"
	| "Duplex"
	| "Studio"
	| "Land"
	| "Other";
export type BuyerType = "street" | "suburb";
export type SellerType = "sale" | "offmarket";

// Comprehensive feature enum matching saaskit PropertyFeature definitions
export type Feature =
	| "CornerBlock"
	| "EnsuiteBathroom"
	| "MatureGarden"
	| "LockUpGarage"
	| "Pool"
	| "SolarPanels"
	| "RenovatedKitchen"
	| "AirConditioning"
	| "HighCeilings"
	| "WaterViews"
	| "StudyRoom"
	| "OpenPlanLiving"
	| "SecuritySystem"
	| "EnergyEfficient"
	| "NorthFacing"
	| "PetFriendly"
	| "WheelchairAccessible"
	| "SmartHome"
	| "Fireplace"
	| "WalkInWardrobe"
	| "LanewayAccess"
	| "Bungalow"
	| "DualLiving"
	| "GrannyFlat"
	| "HeritageListed"
	| "RainwaterTank"
	| "DoubleGlazedWindows"
	| "HomeTheatre"
	| "WineCellar"
	| "OutdoorKitchen";

// Public listing queries intentionally omit exact location/contact fields.
export type ConvexListing = Omit<
	Doc<"listings">,
	| "userId"
	| "address"
	| "latitude"
	| "longitude"
	| "geohash"
	| "contactEmail"
	| "contactPhone"
> & {
	userId?: Doc<"listings">["userId"];
	address?: string;
	latitude?: number;
	longitude?: number;
	geohash?: string;
	contactEmail?: string;
	contactPhone?: string;
	hasExactLocation?: boolean;
};

// Main unified listing type
export type Listing = ConvexListing;

// Type guards for runtime type checking
export function isBuyerListing(
	listing: Listing,
): listing is Listing & { listingType: "buyer" } {
	return listing && listing.listingType === "buyer";
}

export function isSellerListing(
	listing: Listing,
): listing is Listing & { listingType: "seller" } {
	return listing && listing.listingType === "seller";
}

// Helper functions for clean schema access
export function getListingPrice(listing: Listing): {
	min: number;
	max: number;
} {
	return { min: listing.priceMin, max: listing.priceMax };
}

export function getListingAddress(listing: Listing): string {
	if (listing.address) return listing.address;
	return `${listing.suburb}, ${listing.state} ${listing.postcode}`;
}

export function getListingLocation(listing: Listing): {
	lat?: number;
	lng?: number;
} {
	return { lat: listing.latitude, lng: listing.longitude };
}

export function formatListingPrice(listing: Listing): string {
	const { min, max } = getListingPrice(listing);
	const formatPrice = (price: number) => {
		if (price >= 1000000) {
			return `$${(price / 1000000).toFixed(1)}M`;
		}
		return `$${(price / 1000).toFixed(0)}K`;
	};
	if (min === max) {
		return formatPrice(min);
	}
	return `${formatPrice(min)} - ${formatPrice(max)}`;
}

// Form data interfaces for creating/editing listings
export interface CreateListingData {
	listingType: ListingType;
	suburb: string;
	state: string;
	postcode: string;
	address?: string;
	latitude: number;
	longitude: number;
	geohash: string;
	buildingType?: BuildingType;
	bedrooms: number;
	bathrooms: number;
	parking: number;
	priceMin: number;
	priceMax: number;
	features: Feature[];
	buyerType?: BuyerType;
	searchRadius?: number;
	sellerType?: SellerType;
	headline: string;
	description: string;
	images?: string[];
	contactEmail?: string;
	contactPhone?: string;
	isActive: boolean;
	isPremium?: boolean;
}
