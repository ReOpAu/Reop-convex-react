// import { Doc } from "../_generated/dataModel";
import { normalizeState, normalizeSuburb } from "../types/listings";
// export type ConvexListing = Doc<"listings">;
// Transform legacy format to new enhanced format
export function migrateLegacyToEnhanced(legacy) {
    // Create enhanced price structure
    const enhancedPrice = legacy.price || legacy.pricePreference
        ? {
            display: "RANGE",
            confidence: "FIRM",
            value: undefined,
            range: {
                min: (legacy.price || legacy.pricePreference).min,
                max: (legacy.price || legacy.pricePreference).max,
            },
            aiEstimate: undefined,
        }
        : undefined;
    // Create enhanced parking structure
    const enhancedParking = {
        offStreetParking: legacy.propertyDetails.parkingSpaces > 0,
        numberOfSpaces: legacy.propertyDetails.parkingSpaces,
        lockupGarage: legacy.propertyDetails.parkingSpaces > 0,
    };
    // Create structured address
    const enhancedAddress = {
        street: legacy.street,
        streetNumber: legacy.street ? legacy.street.split(" ")[0] : undefined,
        streetName: legacy.street
            ? legacy.street.split(" ").slice(1).join(" ")
            : undefined,
        suburb: normalizeSuburb(legacy.suburb),
        state: normalizeState(legacy.state),
        postalCode: legacy.postcode,
        country: "Australia",
    };
    const fullAddress = legacy.street
        ? `${legacy.street}, ${legacy.suburb} ${legacy.state} ${legacy.postcode}`
        : `${legacy.suburb} ${legacy.state} ${legacy.postcode}`;
    return {
        // Core identity
        listingType: legacy.listingType,
        type: legacy.listingType === "buyer" ? "BUYER" : "SELLER",
        userId: legacy.userId,
        // Address & Location (enhanced)
        address: fullAddress,
        addressDetails: enhancedAddress,
        geohash: legacy.geohash,
        latitude: legacy.latitude,
        longitude: legacy.longitude,
        // Property Details (enhanced)
        buildingType: legacy.buildingType,
        numberOfBedrooms: legacy.propertyDetails.bedrooms,
        parking: enhancedParking,
        propertyFeatures: legacy.features || [],
        // Buyer-specific fields
        buyerListingType: legacy.listingType === "buyer"
            ? legacy.subtype === "street"
                ? "STR"
                : "SUB"
            : undefined,
        radiusKm: legacy.radiusKm,
        pricePreference: legacy.listingType === "buyer" ? enhancedPrice : undefined,
        searchCriteria: legacy.listingType === "buyer"
            ? {
                locations: [legacy.suburb],
                propertyTypes: [legacy.buildingType],
                minBedrooms: Math.max(1, legacy.propertyDetails.bedrooms - 1),
                minBathrooms: Math.max(1, legacy.propertyDetails.bathrooms - 1),
            }
            : undefined,
        // Seller-specific fields
        sellerListingType: legacy.listingType === "seller" ? "OFF" : undefined,
        price: legacy.listingType === "seller" ? enhancedPrice : undefined,
        propertyDetails: legacy.listingType === "seller"
            ? {
                bedrooms: legacy.propertyDetails.bedrooms,
                bathrooms: legacy.propertyDetails.bathrooms,
                propertyType: legacy.buildingType,
                location: legacy.suburb,
                features: legacy.features || [],
            }
            : undefined,
        analytics: legacy.listingType === "seller"
            ? {
                views: 0,
                interestedBuyers: 0,
                savedByUsers: 0,
            }
            : undefined,
        campaignDuration: undefined,
        // Feature preferences
        mustHaveFeatures: legacy.mustHaveFeatures,
        niceToHaveFeatures: legacy.niceToHaveFeatures,
        featureImportance: undefined,
        // Content
        headline: legacy.headline,
        description: legacy.description,
        images: legacy.images,
        // Contact
        contactPhone: undefined,
        contactEmail: undefined,
        // Metadata
        sample: legacy.sample,
        isPremium: legacy.isPremium,
        expiresAt: legacy.expiresAt,
        createdAt: legacy.createdAt,
        updatedAt: legacy.updatedAt,
        // Legacy fields (for backward compatibility)
        subtype: legacy.subtype,
        suburb: legacy.suburb,
        state: legacy.state,
        postcode: legacy.postcode,
        street: legacy.street,
        features: legacy.features,
    };
}
// Check if a listing is using legacy format
export function isLegacyFormat(listing) {
    return (listing &&
        typeof listing.suburb === "string" &&
        typeof listing.state === "string" &&
        typeof listing.postcode === "string" &&
        !listing.addressDetails);
}
// Safe accessor for listing state (backward compatible)
export function getListingState(listing) {
    return listing.addressDetails?.state || listing.state || "";
}
// Safe accessor for listing suburb (backward compatible)
export function getListingSuburb(listing) {
    return listing.addressDetails?.suburb || listing.suburb || "";
}
// Safe accessor for listing postcode (backward compatible)
export function getListingPostcode(listing) {
    return listing.addressDetails?.postalCode || listing.postcode || "";
}
