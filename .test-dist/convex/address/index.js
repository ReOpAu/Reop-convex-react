/**
 * Address API Bridge Module
 *
 * Provides a single, standardized entry point for all address-related functions.
 * This module consolidates legacy scattered functions into a clean, consistent API.
 *
 * Migration Strategy:
 * 1. Export modern address/ functions with standardized names
 * 2. Replace frontend calls from api.suburbLookup.* to api.address.*
 * 3. Once migration complete, remove legacy files (addressFinder.ts, autocomplete.ts, suburbLookup.ts)
 *
 * Naming Convention: [module].[action] format
 * - address.getPlaceSuggestions
 * - address.validateAddress
 * - address.getPlaceDetails
 */
// Re-export modern implementations with standardized names
export { getPlaceSuggestions } from "./getPlaceSuggestions";
export { validateAddress } from "./validateAddress";
export { getPlaceDetails } from "./getPlaceDetails";
export { getPlacePhotos } from "./getPlacePhotos";
// Export utilities for advanced usage
export * from "./utils";
/**
 * API Usage Examples:
 *
 * // Place suggestions with intent classification
 * const suggestions = await convex.action(api.address.getPlaceSuggestions, {
 *   query: "18A Chaucer Crescent",
 *   intent: "address",
 *   maxResults: 5
 * });
 *
 * // Address validation with Google Address Validation API
 * const validation = await convex.action(api.address.validateAddress, {
 *   address: "123 Collins Street, Melbourne VIC 3000"
 * });
 *
 * // Place details with coordinates
 * const details = await convex.action(api.address.getPlaceDetails, {
 *   placeId: "ChIJgf0RD..."
 * });
 */
