import { defineTable } from "convex/server";
import { v } from "convex/values";
export const cartesiaSessions = defineTable({
    sessionId: v.string(),
    ownerTokenIdentifier: v.string(),
    updateType: v.string(),
    data: v.string(), // JSON-encoded payload
    createdAt: v.number(),
    updatedAt: v.number(),
    version: v.number(),
})
    .index("by_sessionId", ["sessionId"])
    .index("by_owner", ["ownerTokenIdentifier"]);
