import { defineTable } from "convex/server";
import { v } from "convex/values";
export const savedListingsTable = defineTable({
    userId: v.id("users"),
    listingId: v.id("listings"),
    savedAt: v.number(), // timestamp
    notes: v.optional(v.string()), // user notes about why they saved it
})
    .index("by_user", ["userId"])
    .index("by_listing", ["listingId"])
    .index("by_user_and_listing", ["userId", "listingId"]); // for checking if specific listing is saved by user
