/**
 * Shared validation patterns for Australian addresses
 * Consolidated from multiple files to ensure consistency
 */
// House number patterns - covers Australian formats
export const HOUSE_NUMBER_PATTERNS = {
    // Basic house number at start: "123 ", "123a ", "123/5 "
    BASIC: /^(\d+[a-z]?([/-]\d+[a-z]?)*)\s+/,
    // Simple house number check: "123"
    SIMPLE: /^\d+[a-z]?\s+/,
    // Any house number in string
    ANY: /^\d+/,
};
// Unit/apartment patterns
export const UNIT_PATTERNS = {
    // Unit at start with various formats
    DETAILED: /^(unit|apt|apartment|suite|shop|level|floor|lot|u|g|l|b)\s*\d+[a-z]?([/-]\d+[a-z]?)*[,\s]/i,
    // Simple unit at start
    SIMPLE: /^(unit|apt|apartment|suite|shop|level|floor|u)\s*\d+/i,
    // Unit/apartment patterns anywhere in query
    ANYWHERE: /\b(unit|apt|apartment|suite|shop|level|floor|lot|u|g|l|b)\s*\d+[a-z]?([/-]\d+[a-z]?)*\b/i,
    // Complex unit formats like "123a/456"
    COMPLEX: /^[a-z]?\d+([/-]\d+[a-z]?)*[,/]\s*\d+\s+/,
};
// Postcode patterns
export const POSTCODE_PATTERNS = {
    // Australian postcode (4 digits)
    BASIC: /\b\d{4}\b/,
    // Australian postcode not starting with 0
    VALID_AU: /\b[1-9]\d{3}\b/,
};
// Australian state patterns
export const AUSTRALIAN_STATE_PATTERNS = {
    // State codes only
    CODES: /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i,
    // Full state names and codes
    FULL: /\b(vic|nsw|qld|wa|sa|tas|nt|act|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i,
};
// Address text patterns
export const ADDRESS_TEXT_PATTERNS = {
    // Simple suburb-like text (letters, spaces, hyphens, apostrophes, numbers)
    SUBURB_LIKE: /^[a-z0-9\s\-'&]+$/i,
    // Exclude pure numbers
    NOT_PURE_NUMBER: /^\d+$/,
    // Simple text for basic classification
    BASIC_TEXT: /^[a-z\s\-']+$/i,
};
// Special suburb patterns
export const SPECIAL_SUBURB_PATTERNS = {
    // St Kilda, Mt Eliza, etc.
    ST_KILDA: /^st\s+kilda/i,
    MOUNT_SUBURBS: /^(mount|mt)\s+/i,
    PORT_SUBURBS: /^port\s+/i,
    GLEN_SUBURBS: /^glen\s+/i,
    BOX_HILL: /^box\s+hill/i,
    ST_ALBANS: /^st\s+albans/i,
    POINT_SUBURBS: /^point\s+/i,
    // Complete suburb names that shouldn't be parsed further
    COMPLETE_NAMES: [/^box\s+hill$/i],
};
// Suburb indicator patterns
export const SUBURB_INDICATOR_PATTERNS = {
    // Direction and descriptive words
    DIRECTIONAL: /\b(north|south|east|west|upper|lower|mount|mt|saint|st|port|glen|box|point|new|old)\s+[a-z]/i,
    // Geographic features
    GEOGRAPHIC: /\b(heights|gardens|valley|beach|park|creek|hill|ridge|bay|cove|grove|lakes|springs|falls)\b/i,
};
// Rural address patterns
export const RURAL_PATTERNS = {
    // Rural address detection
    RURAL_KEYWORDS: /hwy|highway|rd|road|lane|track|springmount|mount|creek|farm|station/i,
};
// String processing patterns
export const TEXT_PROCESSING_PATTERNS = {
    // Split on spaces and filter
    WORD_SPLIT: /\s+/,
    // Split on spaces and commas
    ADDRESS_SPLIT: /[\s,]+/,
    // Clean input
    CLEAN_INPUT: /[^a-zA-Z0-9\s,.'\-]/g,
    // Normalize spaces
    NORMALIZE_SPACES: /\s+/g,
};
// State and postcode cleaning patterns
export const CLEANUP_PATTERNS = {
    // Remove state and postcode combinations
    STATE_POSTCODE: /\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}?/i,
    // Remove state at end
    STATE_END: /\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)$/i,
    // Remove postcode at end
    POSTCODE_END: /\s+\d{4}$/,
};
