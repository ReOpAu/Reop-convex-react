import { v } from "convex/values";
import { query } from "./_generated/server";
import { getSearchGeohashes } from "./geohashUtils";
function toPublicListing(listing) {
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
// Standard weights for score calculation - aligned with frontend
const DEFAULT_WEIGHTS = {
    distance: 30,
    price: 25,
    propertyType: 20,
    bedrooms: 15,
    parking: 5,
    features: 5,
};
/**
 * Calculate comprehensive match score between two listings
 * Uses standardized interface aligned with frontend service
 */
function calculateMatchScore(listingA, listingB, weights = DEFAULT_WEIGHTS) {
    // Calculate individual component scores
    const distanceScore = calculateDistanceScore(listingA, listingB);
    const priceScore = calculatePriceScore(listingA, listingB);
    const propertyTypeScore = calculatePropertyTypeScore(listingA, listingB);
    const bedroomScore = calculateBedroomScore(listingA, listingB);
    const parkingScore = calculateParkingScore(listingA, listingB);
    const featureScore = calculateFeatureScore(listingA, listingB);
    // Calculate weighted overall score
    const totalScore = distanceScore * weights.distance +
        priceScore * weights.price +
        propertyTypeScore * weights.propertyType +
        bedroomScore * weights.bedrooms +
        parkingScore * weights.parking +
        featureScore * weights.features;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const overall = Math.round(totalScore / totalWeight);
    return {
        overall,
        components: {
            distance: distanceScore,
            price: priceScore,
            propertyType: propertyTypeScore,
            bedrooms: bedroomScore,
            parking: parkingScore,
            features: featureScore,
        },
        weights,
    };
}
/**
 * Calculate distance-based score between two listings
 * Aligned with frontend calculateDistanceScore logic
 */
function calculateDistanceScore(originalListing, matchedListing) {
    // Handle same suburb case
    if (originalListing.suburb.toLowerCase() === matchedListing.suburb.toLowerCase()) {
        return 100;
    }
    // Calculate distance if coordinates available
    if (originalListing.latitude &&
        originalListing.longitude &&
        matchedListing.latitude &&
        matchedListing.longitude) {
        const distance = haversine(originalListing.latitude, originalListing.longitude, matchedListing.latitude, matchedListing.longitude);
        // Distance-based scoring: 100 at 0km, decreasing to 0 at 50km
        const maxDistance = 50; // km
        const score = Math.max(0, Math.round(100 * (1 - distance / maxDistance)));
        return score;
    }
    // Fallback: different suburbs with no coordinates = low score
    return 20;
}
/**
 * Calculate price compatibility score
 * Uses buyer-seller dynamics for optimal matching
 */
function calculatePriceScore(originalListing, matchedListing) {
    const originalMin = originalListing.priceMin;
    const originalMax = originalListing.priceMax;
    const matchedMin = matchedListing.priceMin;
    const matchedMax = matchedListing.priceMax;
    // Handle missing price data
    if (!originalMin || !originalMax || !matchedMin || !matchedMax) {
        return 50; // Neutral score when price data unavailable
    }
    // Check for overlap
    const hasOverlap = originalMax >= matchedMin && matchedMax >= originalMin;
    if (!hasOverlap) {
        // Calculate how far apart the ranges are
        const gap = Math.min(Math.abs(originalMin - matchedMax), Math.abs(matchedMin - originalMax));
        const averagePrice = (originalMin + originalMax + matchedMin + matchedMax) / 4;
        const gapRatio = gap / averagePrice;
        // Score decreases as gap increases (max gap ratio of 0.5 = 0 score)
        return Math.max(0, Math.round(100 * (1 - gapRatio * 2)));
    }
    // Calculate overlap quality
    const overlapMin = Math.max(originalMin, matchedMin);
    const overlapMax = Math.min(originalMax, matchedMax);
    const overlapSize = overlapMax - overlapMin;
    const originalRange = originalMax - originalMin;
    const matchedRange = matchedMax - matchedMin;
    const averageRange = (originalRange + matchedRange) / 2;
    const overlapRatio = overlapSize / averageRange;
    return Math.min(100, Math.round(70 + overlapRatio * 30));
}
/**
 * Calculate property type compatibility score
 */
function calculatePropertyTypeScore(originalListing, matchedListing) {
    return originalListing.buildingType === matchedListing.buildingType ? 100 : 0;
}
/**
 * Calculate bedroom count compatibility score
 */
function calculateBedroomScore(originalListing, matchedListing) {
    const diff = Math.abs(originalListing.bedrooms - matchedListing.bedrooms);
    // Perfect match = 100, each bedroom difference reduces score by 25
    return Math.max(0, 100 - diff * 25);
}
/**
 * Calculate parking compatibility score
 */
function calculateParkingScore(originalListing, matchedListing) {
    const diff = Math.abs(originalListing.parking - matchedListing.parking);
    // Perfect match = 100, each parking space difference reduces score by 20
    return Math.max(0, 100 - diff * 20);
}
/**
 * Calculate feature compatibility score
 */
function calculateFeatureScore(originalListing, matchedListing) {
    const originalFeatures = originalListing.features || [];
    const matchedFeatures = matchedListing.features || [];
    // If no features specified, perfect compatibility
    if (originalFeatures.length === 0 && matchedFeatures.length === 0) {
        return 100;
    }
    // If only one has features, partial score
    if (originalFeatures.length === 0 || matchedFeatures.length === 0) {
        return 60;
    }
    // Calculate overlap
    const commonFeatures = originalFeatures.filter((feature) => matchedFeatures.includes(feature));
    const totalUniqueFeatures = new Set([...originalFeatures, ...matchedFeatures])
        .size;
    // Score based on common features vs total unique features
    const overlapRatio = commonFeatures.length / totalUniqueFeatures;
    return Math.round(overlapRatio * 100);
}
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
export const findMatches = query({
    args: {
        listingId: v.id("listings"),
        options: v.optional(v.object({
            minScore: v.optional(v.number()),
            limit: v.optional(v.number()),
            offset: v.optional(v.number()),
            includeScoreBreakdown: v.optional(v.boolean()),
        })),
    },
    handler: async (ctx, { listingId, options }) => {
        const originalListing = await ctx.db.get(listingId);
        if (!originalListing)
            throw new Error("Original listing not found");
        const counterpartType = originalListing.listingType === "seller" ? "buyer" : "seller";
        // ENFORCE STATE BOUNDARIES - Only match within the same state/territory
        const allowedStates = [originalListing.state.toLowerCase()];
        // Get all listings of the counterpart type in the same state
        let candidates = await ctx.db
            .query("listings")
            .withIndex("by_type", (q) => q.eq("listingType", counterpartType))
            .collect();
        candidates = candidates.filter((listing) => listing.isActive === true);
        // STRICT STATE BOUNDARY ENFORCEMENT
        candidates = candidates.filter((listing) => allowedStates.includes(listing.state.toLowerCase()));
        // GEOGRAPHIC FILTERING BASED ON LISTING SUBTYPES
        if (originalListing.geohash) {
            // Get proper geohash neighbors using legacy algorithm (5x5 grid)
            const searchGeohashes = getSearchGeohashes(originalListing.geohash, 5);
            candidates = candidates.filter((listing) => {
                // RULE 1: Always include exact suburb matches regardless of subtype
                if (listing.suburb.toLowerCase() === originalListing.suburb.toLowerCase()) {
                    return true;
                }
                // RULE 2: For suburb listings, ONLY allow exact suburb matches (no geohash expansion)
                if (originalListing.buyerType === "suburb" ||
                    listing.buyerType === "suburb") {
                    return false; // Already checked exact suburb match above, so exclude
                }
                // RULE 3: For street listings, allow geohash neighborhood matching with radius constraints
                if (originalListing.buyerType === "street" &&
                    listing.buyerType === "street" &&
                    listing.geohash) {
                    const isInGeohashNeighborhood = searchGeohashes.some((searchHash) => listing.geohash.startsWith(searchHash.substring(0, 5)));
                    if (!isInGeohashNeighborhood)
                        return false;
                    // If original listing is a street buyer with radius, check distance constraint
                    if (originalListing.listingType === "buyer" &&
                        originalListing.searchRadius) {
                        if (originalListing.latitude &&
                            originalListing.longitude &&
                            listing.latitude &&
                            listing.longitude) {
                            const distance = haversine(originalListing.latitude, originalListing.longitude, listing.latitude, listing.longitude);
                            return distance <= originalListing.searchRadius;
                        }
                        // If coordinates missing, fall back to geohash neighborhood
                        return isInGeohashNeighborhood;
                    }
                    // If candidate is a street buyer with radius, check their constraint
                    if (listing.listingType === "buyer" && listing.searchRadius) {
                        if (listing.latitude &&
                            listing.longitude &&
                            originalListing.latitude &&
                            originalListing.longitude) {
                            const distance = haversine(listing.latitude, listing.longitude, originalListing.latitude, originalListing.longitude);
                            return distance <= listing.searchRadius;
                        }
                        // If coordinates missing, fall back to geohash neighborhood
                        return isInGeohashNeighborhood;
                    }
                    return isInGeohashNeighborhood;
                }
                return false;
            });
        }
        else {
            // Fallback to suburb-only matching if no geohash
            candidates = candidates.filter((listing) => listing.suburb.toLowerCase() === originalListing.suburb.toLowerCase());
        }
        let scoredMatches = [];
        for (const candidate of candidates) {
            const matchResult = calculateMatchScore(originalListing, candidate);
            const distance = originalListing.latitude &&
                originalListing.longitude &&
                candidate.latitude &&
                candidate.longitude
                ? haversine(originalListing.latitude, originalListing.longitude, candidate.latitude, candidate.longitude)
                : undefined;
            scoredMatches.push({
                listing: toPublicListing(candidate),
                score: matchResult.overall,
                distance,
                breakdown: options?.includeScoreBreakdown ? matchResult : undefined,
            });
        }
        scoredMatches = scoredMatches.filter((match) => match.score >= (options?.minScore || 0));
        scoredMatches.sort((a, b) => b.score - a.score);
        // Apply pagination with offset and limit
        const totalCount = scoredMatches.length;
        const offset = options?.offset || 0;
        const limit = options?.limit || 50;
        const paginatedMatches = scoredMatches.slice(offset, offset + limit);
        return {
            matches: paginatedMatches,
            pagination: {
                totalCount,
                offset,
                limit,
                hasMore: offset + limit < totalCount,
            },
        };
    },
});
/**
 * Get match details for two specific listings
 * This is more efficient than fetching all matches and filtering client-side
 */
export const getMatchDetails = query({
    args: {
        originalListingId: v.id("listings"),
        matchedListingId: v.id("listings"),
        includeScoreBreakdown: v.optional(v.boolean()),
    },
    handler: async (ctx, { originalListingId, matchedListingId, includeScoreBreakdown = false }) => {
        // Fetch both listings
        const [originalListing, matchedListing] = await Promise.all([
            ctx.db.get(originalListingId),
            ctx.db.get(matchedListingId),
        ]);
        if (!originalListing) {
            throw new Error("Original listing not found");
        }
        if (!matchedListing) {
            throw new Error("Matched listing not found");
        }
        // Calculate match score and breakdown
        const matchResult = calculateMatchScore(originalListing, matchedListing);
        return {
            originalListing: toPublicListing(originalListing),
            matchedListing: toPublicListing(matchedListing),
            score: matchResult.overall,
            breakdown: includeScoreBreakdown ? matchResult : undefined,
            distance: originalListing.latitude &&
                originalListing.longitude &&
                matchedListing.latitude &&
                matchedListing.longitude
                ? haversine(originalListing.latitude, originalListing.longitude, matchedListing.latitude, matchedListing.longitude)
                : undefined,
        };
    },
});
