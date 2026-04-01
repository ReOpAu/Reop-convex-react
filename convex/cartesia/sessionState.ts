/**
 * Convex state bridge for Cartesia Line agent.
 *
 * Each browser call registers its own session doc. The Cartesia agent can only
 * push updates into an existing session using the shared bridge secret, while
 * reads and clears stay scoped to the authenticated browser session owner.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { isAdminIdentity, requireIdentity } from "../utils/auth";

const SESSION_ID_PATTERN = /^[a-zA-Z0-9:_-]{8,128}$/;

function assertValidSessionId(sessionId: string) {
	if (!SESSION_ID_PATTERN.test(sessionId)) {
		throw new Error("Invalid session ID");
	}
}

function requireBridgeToken(bridgeToken: string) {
	if (!process.env.CARTESIA_BRIDGE_SECRET) {
		throw new Error("CARTESIA_BRIDGE_SECRET is not configured");
	}

	if (bridgeToken !== process.env.CARTESIA_BRIDGE_SECRET) {
		throw new Error("Invalid Cartesia bridge token");
	}
}

export const registerSession = mutation({
	args: {
		sessionId: v.string(),
	},
	handler: async (ctx, args) => {
		assertValidSessionId(args.sessionId);
		const identity = await requireIdentity(ctx);
		const now = Date.now();
		const existing = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (existing) {
			if (existing.ownerTokenIdentifier !== identity.tokenIdentifier) {
				throw new Error("Session is already owned by another user");
			}

			await ctx.db.patch(existing._id, {
				updateType: "registered",
				data: "{}",
				updatedAt: now,
				version: 0,
			});
			return { sessionId: args.sessionId };
		}

		await ctx.db.insert("cartesiaSessions", {
			sessionId: args.sessionId,
			ownerTokenIdentifier: identity.tokenIdentifier,
			updateType: "registered",
			data: "{}",
			createdAt: now,
			updatedAt: now,
			version: 0,
		});

		return { sessionId: args.sessionId };
	},
});

export const pushUpdate = mutation({
	args: {
		sessionId: v.string(),
		updateType: v.string(),
		data: v.string(),
		bridgeToken: v.string(),
	},
	handler: async (ctx, args) => {
		assertValidSessionId(args.sessionId);
		requireBridgeToken(args.bridgeToken);

		const existing = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (!existing) {
			throw new Error("Cartesia session not registered");
		}

		await ctx.db.patch(existing._id, {
			updateType: args.updateType,
			data: args.data,
			updatedAt: Date.now(),
			version: existing.version + 1,
		});
	},
});

export const getLatestUpdate = query({
	args: {
		sessionId: v.string(),
	},
	returns: v.union(
		v.object({
			updateType: v.string(),
			data: v.string(),
			version: v.number(),
			updatedAt: v.number(),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		assertValidSessionId(args.sessionId);
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		const session = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (!session) {
			return null;
		}

		if (
			session.ownerTokenIdentifier !== identity.tokenIdentifier &&
			!isAdminIdentity(identity)
		) {
			return null;
		}

		if (session.version === 0) {
			return null;
		}

		return {
			updateType: session.updateType,
			data: session.data,
			version: session.version,
			updatedAt: session.updatedAt,
		};
	},
});

export const clearSession = mutation({
	args: {
		sessionId: v.string(),
	},
	handler: async (ctx, args) => {
		assertValidSessionId(args.sessionId);
		const identity = await requireIdentity(ctx);
		const existing = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (!existing) {
			return;
		}

		if (
			existing.ownerTokenIdentifier !== identity.tokenIdentifier &&
			!isAdminIdentity(identity)
		) {
			throw new Error("Not authorized to clear this Cartesia session");
		}

		await ctx.db.delete(existing._id);
	},
});
