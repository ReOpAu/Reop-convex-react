import { isAdminAccess } from "../../shared/auth/admin";
export async function requireIdentity(ctx) {
    if (process.env.DISABLE_AUTH_FOR_MUTATIONS === "true") {
        throw new Error("Mutations cannot bypass auth in this build");
    }
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Not authenticated");
    }
    return identity;
}
export function isAdminIdentity(identity) {
    return isAdminAccess({
        email: identity.email,
        subject: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        role: identity.role,
        roles: identity.roles,
        isAdmin: identity.isAdmin,
        sessionClaims: identity,
    });
}
export async function requireAdmin(ctx) {
    const identity = await requireIdentity(ctx);
    if (!isAdminIdentity(identity)) {
        throw new Error("Admin access required");
    }
    return identity;
}
export async function findUserByIdentity(ctx, identity) {
    const directMatch = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
    if (directMatch) {
        return { user: directMatch, matchedByLegacySubject: false };
    }
    const bySubject = await ctx.db
        .query("users")
        .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
        .unique();
    if (bySubject) {
        return { user: bySubject, matchedByLegacySubject: true };
    }
    const legacyMatch = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
        .unique();
    return {
        user: legacyMatch,
        matchedByLegacySubject: Boolean(legacyMatch),
    };
}
export async function upsertCurrentUser(ctx) {
    const identity = await requireIdentity(ctx);
    const { user } = await findUserByIdentity(ctx, identity);
    const profilePatch = {
        name: identity.name,
        email: identity.email,
        image: identity.pictureUrl,
        subject: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
    };
    if (user) {
        await ctx.db.patch(user._id, profilePatch);
        const updatedUser = await ctx.db.get(user._id);
        if (!updatedUser) {
            throw new Error("User not found after update");
        }
        return updatedUser;
    }
    const userId = await ctx.db.insert("users", profilePatch);
    const createdUser = await ctx.db.get(userId);
    if (!createdUser) {
        throw new Error("Failed to create user");
    }
    return createdUser;
}
export async function getCurrentUser(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        return null;
    }
    const { user } = await findUserByIdentity(ctx, identity);
    return user;
}
export async function getAuthenticatedUserIdentifiers(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        return null;
    }
    const { user } = await findUserByIdentity(ctx, identity);
    if (user) {
        return {
            tokenIdentifier: user.tokenIdentifier,
            subject: user.subject,
        };
    }
    return {
        tokenIdentifier: identity.tokenIdentifier,
        subject: identity.subject,
    };
}
export async function requireCurrentUser(ctx) {
    if ("runMutation" in ctx) {
        return upsertCurrentUser(ctx);
    }
    const user = await getCurrentUser(ctx);
    if (!user) {
        throw new Error("User not found");
    }
    return user;
}
export async function requireListingOwnerOrAdmin(ctx, listing) {
    const identity = await requireIdentity(ctx);
    const isAdmin = isAdminIdentity(identity);
    const user = await requireCurrentUser(ctx);
    if (!isAdmin && listing.userId !== user._id) {
        throw new Error("Not authorized to manage this listing");
    }
    return { identity, user, isAdmin };
}
export async function findUserByIdentifier(ctx, userIdentifier) {
    const byToken = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", userIdentifier))
        .unique();
    if (byToken) {
        return byToken;
    }
    return await ctx.db
        .query("users")
        .withIndex("by_subject", (q) => q.eq("subject", userIdentifier))
        .unique();
}
export async function findSubscriptionByUserIdentifiers(ctx, user) {
    const identifiers = [user.tokenIdentifier, user.subject].filter((value) => Boolean(value));
    for (const identifier of identifiers) {
        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("userId", (q) => q.eq("userId", identifier))
            .first();
        if (subscription) {
            return subscription;
        }
    }
    return null;
}
