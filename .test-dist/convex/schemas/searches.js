import { defineTable } from "convex/server";
import { v } from "convex/values";
export const searches = defineTable({
    userId: v.id("users"),
    query: v.string(),
    searchType: v.union(v.literal("suburb"), v.literal("address")),
    timestamp: v.number(),
}).index("by_user", ["userId"]);
