import { defineTable } from "convex/server";
import { v } from "convex/values";
export const webhookEvents = defineTable({
    type: v.string(),
    polarEventId: v.string(),
    createdAt: v.string(),
    modifiedAt: v.string(),
    data: v.any(),
})
    .index("type", ["type"])
    .index("polarEventId", ["polarEventId"]);
