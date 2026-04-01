import { defineTable } from "convex/server";
import { v } from "convex/values";
export const userPreferences = defineTable({
    userId: v.id("users"),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    language: v.optional(v.string()),
}).index("by_user", ["userId"]);
