import { defineTable } from "convex/server";
import { v } from "convex/values";

export const users = defineTable({
	name: v.optional(v.string()),
	email: v.optional(v.string()),
	image: v.optional(v.string()),
	tokenIdentifier: v.string(),
	subject: v.optional(v.string()),
})
	.index("by_token", ["tokenIdentifier"])
	.index("by_subject", ["subject"]);
