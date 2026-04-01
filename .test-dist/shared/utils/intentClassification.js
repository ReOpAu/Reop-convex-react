/**
 * Canonical intent classification function for Convex backend
 * Consolidated from app/utils/addressFinderUtils.ts (most comprehensive implementation)
 */
import { RURAL_KEYWORD_REGEXES, STREET_KEYWORD_REGEXES, } from "../constants/addressTypes";
import { ADDRESS_TEXT_PATTERNS, AUSTRALIAN_STATE_PATTERNS, HOUSE_NUMBER_PATTERNS, POSTCODE_PATTERNS, SPECIAL_SUBURB_PATTERNS, SUBURB_INDICATOR_PATTERNS, UNIT_PATTERNS, } from "../constants/validationPatterns";
export function classifyLocationIntent(query) {
    const lowerQuery = query.toLowerCase().trim();
    // IMMEDIATE ADDRESS RECOGNITION - Recognize obvious address patterns first
    // Enhanced house number patterns - covers more Australian formats
    const hasHouseNumber = HOUSE_NUMBER_PATTERNS.BASIC.test(lowerQuery);
    // Enhanced unit/apartment patterns - covers more variations
    const hasUnitNumber = UNIT_PATTERNS.DETAILED.test(lowerQuery) ||
        UNIT_PATTERNS.COMPLEX.test(lowerQuery);
    // IMMEDIATE ADDRESS RECOGNITION - Number first = likely address
    // This handles cases like "18 s", "123 g", "5 c", "18 melbourne"
    if (hasHouseNumber || hasUnitNumber) {
        return "address";
    }
    // Special handling for common Australian place names that contain street-like words
    const specialCases = [
        SPECIAL_SUBURB_PATTERNS.ST_KILDA, // St Kilda (suburb)
        SPECIAL_SUBURB_PATTERNS.MOUNT_SUBURBS, // Mount suburbs (Mt Eliza, Mt Waverley, Mount Eliza)
        SPECIAL_SUBURB_PATTERNS.PORT_SUBURBS, // Port suburbs (Port Melbourne)
        SPECIAL_SUBURB_PATTERNS.GLEN_SUBURBS, // Glen suburbs (Glen Waverley)
        SPECIAL_SUBURB_PATTERNS.BOX_HILL, // Box Hill
        SPECIAL_SUBURB_PATTERNS.ST_ALBANS, // St Albans
        SPECIAL_SUBURB_PATTERNS.POINT_SUBURBS, // Point suburbs
    ];
    const isSpecialSuburb = specialCases.some((pattern) => pattern.test(lowerQuery));
    // Handle special suburb cases BEFORE street type detection to prevent misclassification
    if (isSpecialSuburb) {
        // For special suburbs, only consider it a street/address if it has additional street indicators
        // beyond the special suburb name itself
        // Special handling for complete suburb names that contain street-like words
        // These are complete suburb names, not prefix + suburb patterns
        const completeSuburbNames = SPECIAL_SUBURB_PATTERNS.COMPLETE_NAMES;
        const isCompleteSuburbName = completeSuburbNames.some((pattern) => pattern.test(lowerQuery));
        // For complete suburb names, don't check for additional street types
        // They are definitively suburbs, not streets
        if (isCompleteSuburbName) {
            return "suburb";
        }
        // For prefix-based special suburbs (St Kilda, Mt Waverley, etc.)
        // Remove the prefix to check if there are additional street indicators
        const withoutSpecialPrefix = lowerQuery.replace(/^(st|mt|mount|port|glen|point)\s+/i, "");
        const hasAdditionalStreetType = STREET_KEYWORD_REGEXES.some((regex) => regex.test(withoutSpecialPrefix));
        // Check if it's a street in a special suburb (e.g., "St Kilda Road")
        if (hasAdditionalStreetType && !hasHouseNumber && !hasUnitNumber) {
            return "street";
        }
        // Check if it's an address in special suburb (e.g., "123 St Kilda Road")
        if ((hasHouseNumber || hasUnitNumber) && hasAdditionalStreetType) {
            return "address";
        }
        // Otherwise it's just the suburb name
        return "suburb";
    }
    // Check if query has street type indicator
    const hasStreetType = STREET_KEYWORD_REGEXES.some((regex) => regex.test(lowerQuery));
    // Rural address pattern: house number + rural keyword
    const hasRuralType = RURAL_KEYWORD_REGEXES.some((regex) => regex.test(lowerQuery));
    // Note: The (hasHouseNumber || hasUnitNumber) && (hasStreetType || hasRuralType) check
    // is now handled by the immediate address recognition above
    // Street name pattern (street type but no house number at start)
    if (hasStreetType && !hasHouseNumber && !hasUnitNumber) {
        return "street";
    }
    // Enhanced unit/apartment patterns anywhere in the query (fallback)
    if (UNIT_PATTERNS.ANYWHERE.test(lowerQuery)) {
        return "address";
    }
    // Check for postcode patterns (4 digits) - these are usually suburbs
    const hasPostcode = POSTCODE_PATTERNS.BASIC.test(lowerQuery);
    // Enhanced Australian state abbreviations and full names
    const hasAustralianState = AUSTRALIAN_STATE_PATTERNS.FULL.test(lowerQuery);
    // Common Australian suburb patterns
    const hasSuburbIndicators = SUBURB_INDICATOR_PATTERNS.DIRECTIONAL.test(lowerQuery) ||
        SUBURB_INDICATOR_PATTERNS.GEOGRAPHIC.test(lowerQuery);
    // If it has postcode, state, or suburb indicators but no street indicators, likely a suburb
    if ((hasPostcode || hasAustralianState || hasSuburbIndicators) &&
        !hasStreetType &&
        !hasRuralType) {
        return "suburb";
    }
    // Enhanced simple text pattern - allows for apostrophes, hyphens, and numbers in suburb names
    const isSuburbLikeText = ADDRESS_TEXT_PATTERNS.SUBURB_LIKE.test(lowerQuery) &&
        !ADDRESS_TEXT_PATTERNS.NOT_PURE_NUMBER.test(lowerQuery);
    // If it's just suburb-like text without street indicators, assume suburb
    if (isSuburbLikeText &&
        !hasStreetType &&
        !hasRuralType &&
        lowerQuery.length > 2) {
        return "suburb";
    }
    return "general";
}
