/**
 * Single source of truth for all listing-related constants
 * Used across schema, mutations, forms, and seed scripts
 */
// Core listing types
export const LISTING_TYPES = ["buyer", "seller"];
export const BUYER_TYPES = ["street", "suburb"];
export const SELLER_TYPES = ["sale", "offmarket"];
// Building types
export const BUILDING_TYPES = [
    "House",
    "Apartment",
    "Townhouse",
    "Villa",
    "Unit",
    "Duplex",
    "Studio",
    "Land",
    "Other",
];
// Australian states
export const AUSTRALIAN_STATES = [
    { value: "NSW", label: "New South Wales" },
    { value: "VIC", label: "Victoria" },
    { value: "QLD", label: "Queensland" },
    { value: "WA", label: "Western Australia" },
    { value: "SA", label: "South Australia" },
    { value: "TAS", label: "Tasmania" },
    { value: "ACT", label: "Australian Capital Territory" },
    { value: "NT", label: "Northern Territory" },
];
// Property features (comprehensive list)
export const FEATURES = [
    "CornerBlock",
    "EnsuiteBathroom",
    "MatureGarden",
    "LockUpGarage",
    "Pool",
    "SolarPanels",
    "RenovatedKitchen",
    "AirConditioning",
    "HighCeilings",
    "WaterViews",
    "StudyRoom",
    "OpenPlanLiving",
    "SecuritySystem",
    "EnergyEfficient",
    "NorthFacing",
    "PetFriendly",
    "WheelchairAccessible",
    "SmartHome",
    "Fireplace",
    "WalkInWardrobe",
    "LanewayAccess",
    "Bungalow",
    "DualLiving",
    "GrannyFlat",
    "HeritageListed",
    "RainwaterTank",
    "DoubleGlazedWindows",
    "HomeTheatre",
    "WineCellar",
    "OutdoorKitchen",
];
// Common features for quick add in forms
export const COMMON_FEATURES = [
    "Pool",
    "Garden",
    "Garage",
    "Carport",
    "AirConditioning",
    "Heating",
    "Fireplace",
    "Balcony",
    "Deck",
    "Shed",
    "StudyRoom",
    "WalkInWardrobe",
    "EnsuiteBathroom",
    "Dishwasher",
    "SolarPanels",
    "SecuritySystem",
    "Intercom",
    "Gym",
];
// Search radius options (in km)
export const SEARCH_RADIUS_OPTIONS = [1, 3, 5, 7, 10];
// Default values
export const DEFAULT_SEARCH_RADIUS = 5;
export const DEFAULT_BEDROOMS = 3;
export const DEFAULT_BATHROOMS = 2;
export const DEFAULT_PARKING = 2;
// Helper type guards
export const isBuyerListing = (type) => type === "buyer";
export const isSellerListing = (type) => type === "seller";
// Feature helpers
export const isCommonFeature = (feature) => {
    return COMMON_FEATURES.includes(feature);
};
// State helpers
export const getStateLabel = (stateValue) => {
    const state = AUSTRALIAN_STATES.find(s => s.value === stateValue);
    return state?.label || stateValue;
};
