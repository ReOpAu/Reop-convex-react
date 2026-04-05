/**
 * Convex state bridge for Cartesia Line agent.
 *
 * Each browser call registers its own session doc. The Cartesia agent can only
 * push updates into an existing session using the shared bridge secret, while
 * reads and clears stay scoped to either the authenticated owner or the
 * anonymous browser capability token created for public sessions.
 */

import type { UserIdentity } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { isAdminIdentity, requireIdentity } from "../utils/auth";

const SESSION_ID_PATTERN = /^[a-zA-Z0-9:_-]{8,128}$/;
const ANONYMOUS_OWNER_TOKEN_PATTERN = /^[a-zA-Z0-9:_-]{16,256}$/;

function assertValidSessionId(sessionId: string) {
	if (!SESSION_ID_PATTERN.test(sessionId)) {
		throw new Error("Invalid session ID");
	}
}

function normalizeAnonymousOwnerToken(token?: string): string | null {
	const normalized = token?.trim();
	if (!normalized) {
		return null;
	}

	if (!ANONYMOUS_OWNER_TOKEN_PATTERN.test(normalized)) {
		throw new Error("Invalid anonymous owner token");
	}

	return normalized;
}

function requireBridgeToken(bridgeToken: string) {
	if (!process.env.CARTESIA_BRIDGE_SECRET) {
		throw new Error("CARTESIA_BRIDGE_SECRET is not configured");
	}

	if (bridgeToken !== process.env.CARTESIA_BRIDGE_SECRET) {
		throw new Error("Invalid Cartesia bridge token");
	}
}

type SessionOwnerRecord = {
	ownerTokenIdentifier: string;
	anonymousOwnerToken?: string;
};

function sessionOwnerMatches(
	session: SessionOwnerRecord,
	identity: UserIdentity | null,
	anonymousOwnerToken: string | null,
) {
	if (identity && isAdminIdentity(identity)) {
		return true;
	}

	if (
		anonymousOwnerToken &&
		session.anonymousOwnerToken === anonymousOwnerToken
	) {
		return true;
	}

	return (
		Boolean(identity) &&
		Boolean(session.ownerTokenIdentifier) &&
		session.ownerTokenIdentifier === identity?.tokenIdentifier
	);
}

export const registerSession = mutation({
	args: {
		sessionId: v.string(),
		anonymousOwnerToken: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		assertValidSessionId(args.sessionId);
		const identity = await ctx.auth.getUserIdentity();
		const anonymousOwnerToken = normalizeAnonymousOwnerToken(
			args.anonymousOwnerToken,
		);
		if (!identity && !anonymousOwnerToken) {
			throw new Error(
				"Cartesia session registration requires authentication or an anonymous owner token",
			);
		}

		const now = Date.now();
		const existing = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (existing) {
			if (!sessionOwnerMatches(existing, identity, anonymousOwnerToken)) {
				throw new Error("Session is already owned by another caller");
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
			ownerTokenIdentifier: identity?.tokenIdentifier ?? "",
			anonymousOwnerToken: anonymousOwnerToken ?? undefined,
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
		anonymousOwnerToken: v.optional(v.string()),
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
		const anonymousOwnerToken = normalizeAnonymousOwnerToken(
			args.anonymousOwnerToken,
		);
		if (!identity && !anonymousOwnerToken) {
			return null;
		}

		const session = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (!session) {
			return null;
		}

		if (!sessionOwnerMatches(session, identity, anonymousOwnerToken)) {
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
		anonymousOwnerToken: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		assertValidSessionId(args.sessionId);
		const identity = await ctx.auth.getUserIdentity();
		const anonymousOwnerToken = normalizeAnonymousOwnerToken(
			args.anonymousOwnerToken,
		);
		if (!identity && !anonymousOwnerToken) {
			await requireIdentity(ctx);
		}

		const existing = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (!existing) {
			return;
		}

		if (!sessionOwnerMatches(existing, identity, anonymousOwnerToken)) {
			throw new Error("Not authorized to clear this Cartesia session");
		}

		await ctx.db.delete(existing._id);
	},
});
