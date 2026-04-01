import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireAdmin, upsertCurrentUser, } from "./utils/auth";
export const findUserByToken = query({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);
        if (!currentUser) {
            return null;
        }
        return [currentUser.tokenIdentifier, currentUser.subject].includes(args.tokenIdentifier)
            ? currentUser
            : null;
    },
});
export const getCurrentUserQuery = query({
    args: {},
    handler: async (ctx) => {
        return await getCurrentUser(ctx);
    },
});
export const listAllUsers = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("users").collect();
    },
});
export const deleteUser = mutation({
    args: { id: v.id("users") },
    handler: async (ctx, { id }) => {
        await requireAdmin(ctx);
        await ctx.db.delete(id);
        return { success: true };
    },
});
export const upsertUser = mutation({
    handler: async (ctx) => {
        return await upsertCurrentUser(ctx);
    },
});
