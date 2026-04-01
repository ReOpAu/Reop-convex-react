import { defineTable } from "convex/server";
import { listingValidator } from "./listings/validator";
// Clean, powerful listing schema - production ready
// Uses shared validator to ensure consistency across mutations
export const listings = defineTable(listingValidator)
    .index("by_type", ["listingType"])
    .index("by_location", ["state", "suburb"])
    .index("by_geohash", ["geohash"]);
