import { Polar } from "@polar-sh/sdk";
import { v } from "convex/values";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { api } from "./_generated/api";
import { action, httpAction, mutation, query } from "./_generated/server";
import { findUserByIdentifier, getAuthenticatedUserIdentifiers, getCurrentUser, requireIdentity, } from "./utils/auth";
function getPolarServer() {
    return process.env.POLAR_SERVER || "sandbox";
}
function createPolarClient() {
    if (!process.env.POLAR_ACCESS_TOKEN) {
        throw new Error("POLAR_ACCESS_TOKEN is not configured");
    }
    return new Polar({
        server: getPolarServer(),
        accessToken: process.env.POLAR_ACCESS_TOKEN,
    });
}
function serializePlans(result) {
    return {
        items: result.items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            isRecurring: item.isRecurring,
            prices: item.prices.map((price) => ({
                id: price.id,
                amount: price.priceAmount,
                currency: price.priceCurrency,
                interval: price.recurringInterval,
            })),
        })),
        pagination: result.pagination,
    };
}
async function createCheckout({ customerEmail, productPriceId, successUrl, metadata, }) {
    const polar = createPolarClient();
    if (!process.env.POLAR_ORGANIZATION_ID) {
        throw new Error("POLAR_ORGANIZATION_ID is not configured");
    }
    const { result: productsResult } = await polar.products.list({
        organizationId: process.env.POLAR_ORGANIZATION_ID,
        isArchived: false,
    });
    let productId = null;
    for (const product of productsResult.items) {
        const hasPrice = product.prices.some((price) => price.id === productPriceId);
        if (hasPrice) {
            productId = product.id;
            break;
        }
    }
    if (!productId) {
        throw new Error(`Product not found for price ID: ${productPriceId}`);
    }
    const result = await polar.checkouts.create({
        products: [productId],
        successUrl,
        customerEmail,
        metadata: {
            ...metadata,
            priceId: productPriceId,
        },
    });
    return result;
}
async function listSubscriptionsForUserIdentifiers(ctx, identifiers) {
    const uniqueById = new Map();
    for (const identifier of identifiers) {
        const subscriptions = await ctx.db
            .query("subscriptions")
            .withIndex("userId", (q) => q.eq("userId", identifier))
            .collect();
        for (const subscription of subscriptions) {
            uniqueById.set(subscription._id, subscription);
        }
    }
    return [...uniqueById.values()].sort((a, b) => {
        const aRank = a.currentPeriodEnd ?? a.startedAt ?? a._creationTime;
        const bRank = b.currentPeriodEnd ?? b.startedAt ?? b._creationTime;
        return bRank - aRank;
    });
}
function pickPrimarySubscription(subscriptions) {
    return (subscriptions.find((subscription) => subscription.status === "active") ??
        subscriptions[0] ??
        null);
}
function buildSubscriptionFields(data, canonicalUserId) {
    return {
        polarId: data.id,
        polarPriceId: data.price_id,
        currency: data.currency,
        interval: data.recurring_interval,
        userId: canonicalUserId ?? data.metadata?.userId,
        status: data.status,
        currentPeriodStart: data.current_period_start
            ? new Date(data.current_period_start).getTime()
            : undefined,
        currentPeriodEnd: data.current_period_end
            ? new Date(data.current_period_end).getTime()
            : undefined,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        amount: data.amount,
        startedAt: data.started_at ? new Date(data.started_at).getTime() : undefined,
        endedAt: data.ended_at ? new Date(data.ended_at).getTime() : undefined,
        canceledAt: data.canceled_at
            ? new Date(data.canceled_at).getTime()
            : undefined,
        customerCancellationReason: data.customer_cancellation_reason || undefined,
        customerCancellationComment: data.customer_cancellation_comment || undefined,
        metadata: data.metadata || {},
        customFieldData: data.custom_field_data || {},
        customerId: data.customer_id,
    };
}
async function resolveCanonicalSubscriptionUserId(ctx, rawUserId) {
    if (!rawUserId) {
        return undefined;
    }
    const user = await findUserByIdentifier(ctx, rawUserId);
    return user?.tokenIdentifier ?? rawUserId;
}
async function upsertSubscriptionByPolarId(ctx, data, canonicalUserId) {
    const existingSubscriptions = data.id
        ? await ctx.db
            .query("subscriptions")
            .withIndex("polarId", (q) => q.eq("polarId", data.id))
            .collect()
        : [];
    const [primary, ...duplicates] = existingSubscriptions;
    for (const duplicate of duplicates) {
        await ctx.db.delete(duplicate._id);
    }
    const fields = buildSubscriptionFields(data, canonicalUserId);
    if (primary) {
        await ctx.db.patch(primary._id, fields);
        return primary._id;
    }
    return await ctx.db.insert("subscriptions", fields);
}
export const getAvailablePlansQuery = query({
    handler: async () => {
        if (!process.env.POLAR_ORGANIZATION_ID) {
            throw new Error("POLAR_ORGANIZATION_ID is not configured");
        }
        const polar = createPolarClient();
        const { result } = await polar.products.list({
            organizationId: process.env.POLAR_ORGANIZATION_ID,
            isArchived: false,
        });
        return serializePlans(result);
    },
});
export const getAvailablePlans = action({
    handler: async () => {
        if (!process.env.POLAR_ORGANIZATION_ID) {
            throw new Error("POLAR_ORGANIZATION_ID is not configured");
        }
        const polar = createPolarClient();
        const { result } = await polar.products.list({
            organizationId: process.env.POLAR_ORGANIZATION_ID,
            isArchived: false,
        });
        return serializePlans(result);
    },
});
export const createCheckoutSession = action({
    args: {
        priceId: v.string(),
    },
    handler: async (ctx, args) => {
        await requireIdentity(ctx);
        const user = await ctx.runMutation(api.users.upsertUser);
        if (!user?.email) {
            throw new Error("Authenticated user is missing an email address");
        }
        const checkout = await createCheckout({
            customerEmail: user.email,
            productPriceId: args.priceId,
            successUrl: `${process.env.FRONTEND_URL}/success`,
            metadata: {
                userId: user.tokenIdentifier,
            },
        });
        return checkout.url;
    },
});
export const checkUserSubscriptionStatus = query({
    args: {},
    handler: async (ctx) => {
        const identifiers = await getAuthenticatedUserIdentifiers(ctx);
        if (!identifiers) {
            return { hasActiveSubscription: false };
        }
        const subscriptions = await listSubscriptionsForUserIdentifiers(ctx, [identifiers.tokenIdentifier, identifiers.subject ?? ""].filter(Boolean));
        const activeSubscription = subscriptions.find((subscription) => subscription.status === "active");
        return {
            hasActiveSubscription: Boolean(activeSubscription),
        };
    },
});
export const fetchUserSubscription = query({
    args: {},
    handler: async (ctx) => {
        const identifiers = await getAuthenticatedUserIdentifiers(ctx);
        if (!identifiers) {
            return null;
        }
        const subscriptions = await listSubscriptionsForUserIdentifiers(ctx, [identifiers.tokenIdentifier, identifiers.subject ?? ""].filter(Boolean));
        return pickPrimarySubscription(subscriptions);
    },
});
export const handleWebhookEvent = mutation({
    args: {
        polarEventId: v.string(),
        body: v.any(),
    },
    handler: async (ctx, args) => {
        const existingEvent = await ctx.db
            .query("webhookEvents")
            .withIndex("polarEventId", (q) => q.eq("polarEventId", args.polarEventId))
            .first();
        if (existingEvent) {
            return { duplicate: true };
        }
        const eventType = args.body.type;
        const eventData = args.body.data ?? {};
        const canonicalUserId = await resolveCanonicalSubscriptionUserId(ctx, eventData.metadata?.userId);
        await ctx.db.insert("webhookEvents", {
            type: eventType,
            polarEventId: args.polarEventId,
            createdAt: eventData.created_at ?? new Date().toISOString(),
            modifiedAt: eventData.modified_at ?? eventData.created_at ?? new Date().toISOString(),
            data: args.body,
        });
        switch (eventType) {
            case "subscription.created":
            case "subscription.updated":
            case "subscription.active":
            case "subscription.canceled":
            case "subscription.uncanceled":
            case "subscription.revoked":
                await upsertSubscriptionByPolarId(ctx, eventData, canonicalUserId);
                break;
            case "order.created":
                break;
            default:
                console.warn(`Unhandled event type: ${eventType}`);
                break;
        }
        return { duplicate: false };
    },
});
const validateEvent = (body, headers, secret) => {
    const base64Secret = btoa(secret);
    const webhook = new Webhook(base64Secret);
    webhook.verify(body, headers);
};
export const paymentWebhook = httpAction(async (ctx, request) => {
    try {
        const rawBody = await request.text();
        const headers = {};
        request.headers.forEach((value, key) => {
            headers[key] = value;
        });
        if (!process.env.POLAR_WEBHOOK_SECRET) {
            throw new Error("POLAR_WEBHOOK_SECRET environment variable is not configured");
        }
        validateEvent(rawBody, headers, process.env.POLAR_WEBHOOK_SECRET);
        const body = JSON.parse(rawBody);
        const polarEventId = headers["webhook-id"] ??
            body.id ??
            `${body.type}:${body.data?.id ?? "unknown"}`;
        await ctx.runMutation(api.subscriptions.handleWebhookEvent, {
            polarEventId,
            body,
        });
        return new Response(JSON.stringify({ message: "Webhook received!" }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
    catch (error) {
        if (error instanceof WebhookVerificationError) {
            return new Response(JSON.stringify({ message: "Webhook verification failed" }), {
                status: 403,
                headers: {
                    "Content-Type": "application/json",
                },
            });
        }
        return new Response(JSON.stringify({ message: "Webhook failed" }), {
            status: 400,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
});
export const createCustomerPortalUrl = action({
    args: {},
    handler: async (ctx) => {
        await requireIdentity(ctx);
        await ctx.runMutation(api.users.upsertUser);
        const subscription = await ctx.runQuery(api.subscriptions.fetchUserSubscription, {});
        if (!subscription?.customerId) {
            throw new Error("No customer portal is available for this user");
        }
        const polar = createPolarClient();
        try {
            const result = await polar.customerSessions.create({
                customerId: subscription.customerId,
            });
            return { url: result.customerPortalUrl };
        }
        catch (error) {
            console.error("Error creating customer session:", error);
            throw new Error("Failed to create customer session");
        }
    },
});
