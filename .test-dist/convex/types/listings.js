import { z } from "zod";
// Enums (extracted from @saaskit)
export const State = {
    NSW: "NSW",
    VIC: "VIC",
    QLD: "QLD",
    WA: "WA",
    SA: "SA",
    NT: "NT",
    ACT: "ACT",
    TAS: "TAS",
};
export const VALID_STATES = Object.keys(State);
export const Country = {
    Australia: "Australia",
};
export const BuildingType = {
    Apartment: "Apartment",
    House: "House",
    Townhouse: "Townhouse",
};
export const BuyerListingType = { STR: "Street", SUB: "Suburb" };
export const SellerListingType = {
    OFF: "OffMarket",
    PRE: "PreMarket",
    O2O: "Open-to-Offers",
};
export const PropertyFeature = {
    CornerBlock: "Corner Block",
    EnsuiteBathroom: "Ensuite Bathroom",
    MatureGarden: "Mature Garden",
    LockUpGarage: "Lock-Up Garage",
    Pool: "Pool",
    SolarPanels: "Solar Panels",
    RenovatedKitchen: "Renovated Kitchen",
    AirConditioning: "Air Conditioning",
    HighCeilings: "High Ceilings",
    WaterViews: "Water Views",
    StudyRoom: "Study Room",
    OpenPlanLiving: "Open Plan Living",
    SecuritySystem: "Security System",
    EnergyEfficient: "Energy Efficient",
    NorthFacing: "North Facing",
    PetFriendly: "Pet Friendly",
    WheelchairAccessible: "Wheelchair Accessible",
    SmartHome: "Smart Home",
    Fireplace: "Fireplace",
    WalkInWardrobe: "Walk-In Wardrobe",
    LanewayAccess: "Laneway Access",
    Bungalow: "Bungalow",
    DualLiving: "Dual Living",
    GrannyFlat: "Granny Flat",
    HeritageListed: "Heritage Listed",
    RainwaterTank: "Rainwater Tank",
    DoubleGlazedWindows: "Double Glazed Windows",
    HomeTheatre: "Home Theatre",
    WineCellar: "Wine Cellar",
    OutdoorKitchen: "Outdoor Kitchen",
};
export const PriceRangeValues = {
    UpTo1M: 1000000,
    UpTo1_5M: 1500000,
    UpTo2M: 2000000,
    Over2M: 2000001,
};
export const BuyerSearchRadius = {
    ONE: 1,
    THREE: 3,
    FIVE: 5,
    SEVEN: 7,
};
// Create Zod enums
export const StateEnum = z.enum(Object.keys(State));
export const CountryEnum = z.enum(Object.keys(Country));
export const BuildingTypeEnum = z.enum(Object.keys(BuildingType));
export const BuyerListingTypeEnum = z.enum(Object.keys(BuyerListingType));
export const SellerListingTypeEnum = z.enum(Object.keys(SellerListingType));
export const PropertyFeatureEnum = z.enum(Object.keys(PropertyFeature));
export const BuyerSearchRadiusEnum = z.union([
    z.literal(1),
    z.literal(3),
    z.literal(5),
    z.literal(7),
]);
export const PriceRangeEnum = z.enum(Object.keys(PriceRangeValues));
// Zod Schemas
export const AddressDetailsSchema = z.object({
    street: z.string().optional(),
    streetNumber: z.string().optional(),
    streetName: z.string().optional(),
    suburb: z.string(),
    state: StateEnum,
    postalCode: z.string(),
    country: z.literal("Australia"),
});
export const ParkingDetailsSchema = z
    .object({
    offStreetParking: z.boolean(),
    numberOfSpaces: z.union([
        z.literal(-1), // Driveway only
        z.literal(0), // None
        z.literal(1), // 1 space
        z.literal(2), // 2 spaces
        z.literal(3), // 3+ spaces
    ]),
    lockupGarage: z.boolean(),
})
    .refine((data) => {
    // If no OSP, spaces should be 0 and no LUG
    if (!data.offStreetParking) {
        return data.numberOfSpaces === 0 && !data.lockupGarage;
    }
    // If has OSP, must have either driveway or spaces
    return data.numberOfSpaces >= -1;
}, {
    message: "Invalid parking configuration",
});
export const PriceDetailsSchema = z.object({
    display: z.enum(["FIXED", "RANGE", "POA"]),
    confidence: z.enum(["FIRM", "NEGOTIABLE", "POA"]),
    value: z.number().optional(),
    range: z.object({
        min: z.number(),
        max: z.number(),
    }),
    aiEstimate: z
        .object({
        minEstimate: z.number(),
        maxEstimate: z.number(),
        confidence: z.number(),
    })
        .optional(),
});
export const SearchCriteriaSchema = z.object({
    locations: z.array(z.string()),
    propertyTypes: z.array(z.string()),
    minBedrooms: z.number(),
    minBathrooms: z.number(),
});
export const PropertyDetailsSchema = z.object({
    bedrooms: z.number(),
    bathrooms: z.number(),
    propertyType: z.string(),
    location: z.string(),
    features: z.array(z.string()),
});
export const AnalyticsSchema = z.object({
    views: z.number(),
    interestedBuyers: z.number(),
    savedByUsers: z.number(),
});
// Validation functions (keeping business logic from @saaskit)
export function validateBuyerAddressRequirements(data) {
    if (!data.buyerListingType || !data.addressDetails)
        return true;
    // For SUBURB listings, both streetName and streetNumber should be empty
    if (data.buyerListingType === "SUB") {
        return !data.addressDetails.streetName && !data.addressDetails.streetNumber;
    }
    // For STREET listings, streetName should exist but streetNumber should be empty
    if (data.buyerListingType === "STR") {
        return data.addressDetails.streetName && !data.addressDetails.streetNumber;
    }
    return true;
}
// Utility functions
export function normalizeState(state) {
    const normalized = state.trim().toUpperCase();
    return normalized in State ? normalized : "NSW";
}
export function normalizeSuburb(suburb) {
    return suburb.trim().replace(/\s+/g, " ");
}
