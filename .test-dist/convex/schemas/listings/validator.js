import { v } from "convex/values";
import { BUILDING_TYPES, BUYER_TYPES, FEATURES, LISTING_TYPES, SELLER_TYPES, } from "../../../shared/constants/listingConstants";
/**
 * Reusable validator object for listings
 * Single source of truth for listing structure across schema and mutations
 */
export const listingValidator = {
    // Core Identity
    listingType: v.union(...LISTING_TYPES.map((t) => v.literal(t))),
    userId: v.id("users"),
    // Location (simple & clean)
    suburb: v.string(),
    state: v.string(),
    postcode: v.string(),
    address: v.optional(v.string()), // Full address for sellers
    latitude: v.number(),
    longitude: v.number(),
    geohash: v.string(),
    // Property Basics
    buildingType: v.optional(v.union(...BUILDING_TYPES.map((t) => v.literal(t)))),
    bedrooms: v.number(),
    bathrooms: v.number(),
    parking: v.number(), // Simple: number of spaces
    // Price (simple & powerful)
    priceMin: v.number(),
    priceMax: v.number(),
    // Features (comprehensive enum)
    features: v.array(v.union(...FEATURES.map((f) => v.literal(f)))),
    // Buyer-specific
    buyerType: v.optional(v.union(...BUYER_TYPES.map((t) => v.literal(t)))),
    searchRadius: v.optional(v.number()), // km for street buyers
    // Seller-specific
    sellerType: v.optional(v.union(...SELLER_TYPES.map((t) => v.literal(t)))),
    // Content
    headline: v.string(),
    description: v.string(),
    images: v.optional(v.array(v.string())),
    // Contact
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    // Metadata
    isActive: v.boolean(),
    isPremium: v.optional(v.boolean()),
    sample: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
};
/**
 * Partial validator for creating listings (without server-generated fields)
 */
export const createListingValidator = {
    listingType: listingValidator.listingType,
    suburb: listingValidator.suburb,
    state: listingValidator.state,
    postcode: listingValidator.postcode,
    address: listingValidator.address,
    latitude: listingValidator.latitude,
    longitude: listingValidator.longitude,
    geohash: listingValidator.geohash,
    buildingType: listingValidator.buildingType,
    bedrooms: listingValidator.bedrooms,
    bathrooms: listingValidator.bathrooms,
    parking: listingValidator.parking,
    priceMin: listingValidator.priceMin,
    priceMax: listingValidator.priceMax,
    features: listingValidator.features,
    buyerType: listingValidator.buyerType,
    searchRadius: listingValidator.searchRadius,
    sellerType: listingValidator.sellerType,
    headline: listingValidator.headline,
    description: listingValidator.description,
    images: listingValidator.images,
    contactEmail: listingValidator.contactEmail,
    contactPhone: listingValidator.contactPhone,
    isActive: listingValidator.isActive,
    isPremium: listingValidator.isPremium,
    sample: listingValidator.sample,
};
/**
 * Validator for updating listings (all fields optional except id)
 */
const editableListingValidator = {
    listingType: listingValidator.listingType,
    suburb: listingValidator.suburb,
    state: listingValidator.state,
    postcode: listingValidator.postcode,
    address: listingValidator.address,
    latitude: listingValidator.latitude,
    longitude: listingValidator.longitude,
    geohash: listingValidator.geohash,
    buildingType: listingValidator.buildingType,
    bedrooms: listingValidator.bedrooms,
    bathrooms: listingValidator.bathrooms,
    parking: listingValidator.parking,
    priceMin: listingValidator.priceMin,
    priceMax: listingValidator.priceMax,
    features: listingValidator.features,
    buyerType: listingValidator.buyerType,
    searchRadius: listingValidator.searchRadius,
    sellerType: listingValidator.sellerType,
    headline: listingValidator.headline,
    description: listingValidator.description,
    images: listingValidator.images,
    contactEmail: listingValidator.contactEmail,
    contactPhone: listingValidator.contactPhone,
    isActive: listingValidator.isActive,
    isPremium: listingValidator.isPremium,
    sample: listingValidator.sample,
};
export const updateListingValidator = Object.fromEntries(Object.entries(editableListingValidator).map(([key, value]) => [
    key,
    v.optional(value),
]));
