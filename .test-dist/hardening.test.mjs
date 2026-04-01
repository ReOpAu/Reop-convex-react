// tests/hardening.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

// convex/listings.ts
import { v as v2 } from "convex/values";

// convex/_generated/server.js
import {
  actionGeneric,
  httpActionGeneric,
  queryGeneric,
  mutationGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric
} from "convex/server";
var query = queryGeneric;
var mutation = mutationGeneric;
var internalMutation = internalMutationGeneric;
var action = actionGeneric;
var httpAction = httpActionGeneric;

// convex/schemas/listings/validator.ts
import { v } from "convex/values";

// shared/constants/listingConstants.ts
var LISTING_TYPES = ["buyer", "seller"];
var BUYER_TYPES = ["street", "suburb"];
var SELLER_TYPES = ["sale", "offmarket"];
var BUILDING_TYPES = [
  "House",
  "Apartment",
  "Townhouse",
  "Villa",
  "Unit",
  "Duplex",
  "Studio",
  "Land",
  "Other"
];
var FEATURES = [
  "CornerBlock",
  "EnsuiteBathroom",
  "MatureGarden",
  "LockUpGarage",
  "Pool",
  "SolarPanels",
  "RenovatedKitchen",
  "AirConditioning",
  "HighCeilings",
  "WaterViews",
  "StudyRoom",
  "OpenPlanLiving",
  "SecuritySystem",
  "EnergyEfficient",
  "NorthFacing",
  "PetFriendly",
  "WheelchairAccessible",
  "SmartHome",
  "Fireplace",
  "WalkInWardrobe",
  "LanewayAccess",
  "Bungalow",
  "DualLiving",
  "GrannyFlat",
  "HeritageListed",
  "RainwaterTank",
  "DoubleGlazedWindows",
  "HomeTheatre",
  "WineCellar",
  "OutdoorKitchen"
];

// convex/schemas/listings/validator.ts
var listingValidator = {
  // Core Identity
  listingType: v.union(...LISTING_TYPES.map((t) => v.literal(t))),
  userId: v.id("users"),
  // Location (simple & clean)
  suburb: v.string(),
  state: v.string(),
  postcode: v.string(),
  address: v.optional(v.string()),
  // Full address for sellers
  latitude: v.number(),
  longitude: v.number(),
  geohash: v.string(),
  // Property Basics
  buildingType: v.optional(v.union(...BUILDING_TYPES.map((t) => v.literal(t)))),
  bedrooms: v.number(),
  bathrooms: v.number(),
  parking: v.number(),
  // Simple: number of spaces
  // Price (simple & powerful)
  priceMin: v.number(),
  priceMax: v.number(),
  // Features (comprehensive enum)
  features: v.array(v.union(...FEATURES.map((f) => v.literal(f)))),
  // Buyer-specific
  buyerType: v.optional(v.union(...BUYER_TYPES.map((t) => v.literal(t)))),
  searchRadius: v.optional(v.number()),
  // km for street buyers
  // Seller-specific
  sellerType: v.optional(v.union(...SELLER_TYPES.map((t) => v.literal(t)))),
  // Content
  headline: v.string(),
  description: v.string(),
  images: v.optional(v.array(v.string())),
  // Contact
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  // Metadata
  isActive: v.boolean(),
  isPremium: v.optional(v.boolean()),
  sample: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number()
};
var createListingValidator = {
  listingType: listingValidator.listingType,
  suburb: listingValidator.suburb,
  state: listingValidator.state,
  postcode: listingValidator.postcode,
  address: listingValidator.address,
  latitude: listingValidator.latitude,
  longitude: listingValidator.longitude,
  geohash: listingValidator.geohash,
  buildingType: listingValidator.buildingType,
  bedrooms: listingValidator.bedrooms,
  bathrooms: listingValidator.bathrooms,
  parking: listingValidator.parking,
  priceMin: listingValidator.priceMin,
  priceMax: listingValidator.priceMax,
  features: listingValidator.features,
  buyerType: listingValidator.buyerType,
  searchRadius: listingValidator.searchRadius,
  sellerType: listingValidator.sellerType,
  headline: listingValidator.headline,
  description: listingValidator.description,
  images: listingValidator.images,
  contactEmail: listingValidator.contactEmail,
  contactPhone: listingValidator.contactPhone,
  isActive: listingValidator.isActive,
  isPremium: listingValidator.isPremium,
  sample: listingValidator.sample
};
var editableListingValidator = {
  listingType: listingValidator.listingType,
  suburb: listingValidator.suburb,
  state: listingValidator.state,
  postcode: listingValidator.postcode,
  address: listingValidator.address,
  latitude: listingValidator.latitude,
  longitude: listingValidator.longitude,
  geohash: listingValidator.geohash,
  buildingType: listingValidator.buildingType,
  bedrooms: listingValidator.bedrooms,
  bathrooms: listingValidator.bathrooms,
  parking: listingValidator.parking,
  priceMin: listingValidator.priceMin,
  priceMax: listingValidator.priceMax,
  features: listingValidator.features,
  buyerType: listingValidator.buyerType,
  searchRadius: listingValidator.searchRadius,
  sellerType: listingValidator.sellerType,
  headline: listingValidator.headline,
  description: listingValidator.description,
  images: listingValidator.images,
  contactEmail: listingValidator.contactEmail,
  contactPhone: listingValidator.contactPhone,
  isActive: listingValidator.isActive,
  isPremium: listingValidator.isPremium,
  sample: listingValidator.sample
};
var updateListingValidator = Object.fromEntries(
  Object.entries(editableListingValidator).map(([key, value]) => [
    key,
    v.optional(value)
  ])
);

// shared/auth/admin.ts
var ADMIN_ROLE_VALUES = /* @__PURE__ */ new Set(["admin", "owner", "superadmin"]);
function parseAllowlist(value) {
  if (!value) {
    return /* @__PURE__ */ new Set();
  }
  return new Set(
    value.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean)
  );
}
function includesAdminRole(value) {
  if (typeof value === "string") {
    return ADMIN_ROLE_VALUES.has(value.trim().toLowerCase());
  }
  if (Array.isArray(value)) {
    return value.some((entry) => includesAdminRole(entry));
  }
  if (typeof value === "boolean") {
    return value;
  }
  return false;
}
function metadataIsAdmin(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const metadata = value;
  return includesAdminRole(metadata.role) || includesAdminRole(metadata.roles) || includesAdminRole(metadata.isAdmin);
}
function isAdminAccess(identity) {
  const adminEmails = parseAllowlist(process.env.ADMIN_EMAIL_ALLOWLIST);
  const adminUserIds = parseAllowlist(process.env.ADMIN_USER_ID_ALLOWLIST);
  const adminTokenIdentifiers = parseAllowlist(
    process.env.ADMIN_TOKEN_IDENTIFIER_ALLOWLIST
  );
  const email = identity.email?.trim().toLowerCase();
  const subject = identity.subject?.trim().toLowerCase();
  const tokenIdentifier = identity.tokenIdentifier?.trim().toLowerCase();
  return Boolean(email) && adminEmails.has(email) || Boolean(subject) && adminUserIds.has(subject) || Boolean(tokenIdentifier) && adminTokenIdentifiers.has(tokenIdentifier) || includesAdminRole(identity.role) || includesAdminRole(identity.roles) || includesAdminRole(identity.isAdmin) || metadataIsAdmin(identity.publicMetadata) || metadataIsAdmin(identity.privateMetadata) || metadataIsAdmin(identity.sessionClaims);
}

// convex/utils/auth.ts
async function requireIdentity(ctx) {
  if (process.env.DISABLE_AUTH_FOR_MUTATIONS === "true") {
    throw new Error("Mutations cannot bypass auth in this build");
  }
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}
function isAdminIdentity(identity) {
  return isAdminAccess({
    email: identity.email,
    subject: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    role: identity.role,
    roles: identity.roles,
    isAdmin: identity.isAdmin,
    sessionClaims: identity
  });
}
async function requireAdmin(ctx) {
  const identity = await requireIdentity(ctx);
  if (!isAdminIdentity(identity)) {
    throw new Error("Admin access required");
  }
  return identity;
}
async function findUserByIdentity(ctx, identity) {
  const directMatch = await ctx.db.query("users").withIndex(
    "by_token",
    (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)
  ).unique();
  if (directMatch) {
    return { user: directMatch, matchedByLegacySubject: false };
  }
  const bySubject = await ctx.db.query("users").withIndex("by_subject", (q) => q.eq("subject", identity.subject)).unique();
  if (bySubject) {
    return { user: bySubject, matchedByLegacySubject: true };
  }
  const legacyMatch = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject)).unique();
  return {
    user: legacyMatch,
    matchedByLegacySubject: Boolean(legacyMatch)
  };
}
async function upsertCurrentUser(ctx) {
  const identity = await requireIdentity(ctx);
  const { user } = await findUserByIdentity(ctx, identity);
  const profilePatch = {
    name: identity.name,
    email: identity.email,
    image: identity.pictureUrl,
    subject: identity.subject,
    tokenIdentifier: identity.tokenIdentifier
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
async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  const { user } = await findUserByIdentity(ctx, identity);
  return user;
}
async function getAuthenticatedUserIdentifiers(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  const { user } = await findUserByIdentity(ctx, identity);
  if (user) {
    return {
      tokenIdentifier: user.tokenIdentifier,
      subject: user.subject
    };
  }
  return {
    tokenIdentifier: identity.tokenIdentifier,
    subject: identity.subject
  };
}
async function requireCurrentUser(ctx) {
  if ("runMutation" in ctx) {
    return upsertCurrentUser(ctx);
  }
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}
async function requireListingOwnerOrAdmin(ctx, listing) {
  const identity = await requireIdentity(ctx);
  const isAdmin = isAdminIdentity(identity);
  const user = await requireCurrentUser(ctx);
  if (!isAdmin && listing.userId !== user._id) {
    throw new Error("Not authorized to manage this listing");
  }
  return { identity, user, isAdmin };
}
async function findUserByIdentifier(ctx, userIdentifier) {
  const byToken = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", userIdentifier)).unique();
  if (byToken) {
    return byToken;
  }
  return await ctx.db.query("users").withIndex("by_subject", (q) => q.eq("subject", userIdentifier)).unique();
}

// convex/listings.ts
function sortListingsByNewest(listings) {
  return [...listings].sort((a, b) => b.updatedAt - a.updatedAt);
}
function paginate(items, page = 1, pageSize = 12) {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return {
    items: items.slice(startIndex, endIndex),
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      pageSize,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    }
  };
}
function normalizeSuburbFilter(suburb) {
  return suburb.replace(/-/g, " ").split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}
function applyListingFilters(listings, {
  listingType,
  state,
  suburb
}) {
  let results = listings;
  if (listingType) {
    results = results.filter((listing) => listing.listingType === listingType);
  }
  if (state) {
    results = results.filter(
      (listing) => listing.state.toLowerCase() === state.toLowerCase()
    );
  }
  if (suburb) {
    const normalizedSuburb = normalizeSuburbFilter(suburb);
    results = results.filter(
      (listing) => listing.suburb.toLowerCase() === normalizedSuburb.toLowerCase()
    );
  }
  return results;
}
function toPublicListing(listing) {
  return {
    _id: listing._id,
    _creationTime: listing._creationTime,
    listingType: listing.listingType,
    suburb: listing.suburb,
    state: listing.state,
    postcode: listing.postcode,
    buildingType: listing.buildingType,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    parking: listing.parking,
    priceMin: listing.priceMin,
    priceMax: listing.priceMax,
    features: listing.features,
    buyerType: listing.buyerType,
    searchRadius: listing.searchRadius,
    sellerType: listing.sellerType,
    headline: listing.headline,
    description: listing.description,
    images: listing.images,
    isActive: listing.isActive,
    isPremium: listing.isPremium,
    sample: listing.sample,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    hasExactLocation: false
  };
}
var clearAllListings = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const listings = await ctx.db.query("listings").collect();
    for (const listing of listings) {
      await ctx.db.delete(listing._id);
    }
    return { success: true, cleared: listings.length };
  }
});
var createListing = mutation({
  args: {
    listing: v2.object(createListingValidator)
  },
  handler: async (ctx, { listing }) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("listings", {
      ...listing,
      userId: user._id,
      createdAt: now,
      updatedAt: now
    });
  }
});
var getListing = query({
  args: { id: v2.id("listings") },
  handler: async (ctx, { id }) => {
    const listing = await ctx.db.get(id);
    if (!listing || !listing.isActive) {
      return null;
    }
    return toPublicListing(listing);
  }
});
var getListingForEdit = query({
  args: { id: v2.id("listings") },
  handler: async (ctx, { id }) => {
    const listing = await ctx.db.get(id);
    if (!listing) {
      return null;
    }
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const isAdmin = isAdminIdentity(identity);
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    if (!isAdmin && listing.userId !== user._id) {
      return null;
    }
    return listing;
  }
});
var updateListing = mutation({
  args: {
    id: v2.id("listings"),
    updates: v2.object(updateListingValidator)
  },
  handler: async (ctx, { id, updates }) => {
    const listing = await ctx.db.get(id);
    if (!listing) {
      throw new Error("Listing not found");
    }
    await requireListingOwnerOrAdmin(ctx, listing);
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now()
    });
    return await ctx.db.get(id);
  }
});
var deleteListing = mutation({
  args: { id: v2.id("listings") },
  handler: async (ctx, { id }) => {
    const listing = await ctx.db.get(id);
    if (!listing) {
      throw new Error("Listing not found");
    }
    await requireListingOwnerOrAdmin(ctx, listing);
    await ctx.db.delete(id);
    return { success: true };
  }
});
var listListings = query({
  args: {
    listingType: v2.optional(v2.union(v2.literal("buyer"), v2.literal("seller"))),
    state: v2.optional(v2.string()),
    suburb: v2.optional(v2.string()),
    page: v2.optional(v2.number()),
    pageSize: v2.optional(v2.number())
  },
  handler: async (ctx, { listingType, state, suburb, page = 1, pageSize = 12 }) => {
    const allListings = await ctx.db.query("listings").collect();
    const filteredListings = applyListingFilters(
      sortListingsByNewest(
        allListings.filter((listing) => listing.isActive === true)
      ),
      { listingType, state, suburb }
    );
    const { items, pagination } = paginate(filteredListings, page, pageSize);
    return {
      listings: items.map(toPublicListing),
      pagination
    };
  }
});
var listMyListings = query({
  args: {
    listingType: v2.optional(v2.union(v2.literal("buyer"), v2.literal("seller"))),
    page: v2.optional(v2.number()),
    pageSize: v2.optional(v2.number())
  },
  handler: async (ctx, { listingType, page = 1, pageSize = 24 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        listings: [],
        pagination: paginate([], page, pageSize).pagination
      };
    }
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        listings: [],
        pagination: paginate([], page, pageSize).pagination
      };
    }
    const listings = await ctx.db.query("listings").collect();
    const filteredListings = sortListingsByNewest(
      listings.filter(
        (listing) => listing.userId === user._id && (!listingType || listing.listingType === listingType)
      )
    );
    const { items, pagination } = paginate(filteredListings, page, pageSize);
    return {
      listings: items,
      pagination
    };
  }
});
var listListingsAdmin = query({
  args: {
    listingType: v2.optional(v2.union(v2.literal("buyer"), v2.literal("seller"))),
    state: v2.optional(v2.string()),
    suburb: v2.optional(v2.string()),
    page: v2.optional(v2.number()),
    pageSize: v2.optional(v2.number())
  },
  handler: async (ctx, { listingType, state, suburb, page = 1, pageSize = 20 }) => {
    await requireAdmin(ctx);
    const allListings = await ctx.db.query("listings").collect();
    const filteredListings = applyListingFilters(
      sortListingsByNewest(allListings),
      { listingType, state, suburb }
    );
    const { items, pagination } = paginate(filteredListings, page, pageSize);
    return {
      listings: items,
      pagination
    };
  }
});
var getAllListingsDebug = query({
  args: {
    page: v2.optional(v2.number()),
    pageSize: v2.optional(v2.number())
  },
  handler: async (ctx, { page = 1, pageSize = 50 }) => {
    await requireAdmin(ctx);
    const allListings = sortListingsByNewest(await ctx.db.query("listings").collect());
    const { items, pagination } = paginate(allListings, page, pageSize);
    return {
      listings: items.map((listing) => ({
        id: listing._id,
        listingType: listing.listingType,
        state: listing.state,
        suburb: listing.suburb,
        isActive: listing.isActive,
        ownerUserId: listing.userId
      })),
      pagination
    };
  }
});
var saveListing = mutation({
  args: {
    listingId: v2.id("listings"),
    notes: v2.optional(v2.string())
  },
  handler: async (ctx, { listingId, notes }) => {
    const user = await requireCurrentUser(ctx);
    const existingSave = await ctx.db.query("savedListings").withIndex(
      "by_user_and_listing",
      (q) => q.eq("userId", user._id).eq("listingId", listingId)
    ).unique();
    if (existingSave) {
      if (notes !== void 0) {
        await ctx.db.patch(existingSave._id, { notes });
      }
      return { success: true, alreadySaved: true };
    }
    await ctx.db.insert("savedListings", {
      userId: user._id,
      listingId,
      savedAt: Date.now(),
      notes
    });
    return { success: true, alreadySaved: false };
  }
});
var unsaveListing = mutation({
  args: { listingId: v2.id("listings") },
  handler: async (ctx, { listingId }) => {
    const user = await requireCurrentUser(ctx);
    const savedListing = await ctx.db.query("savedListings").withIndex(
      "by_user_and_listing",
      (q) => q.eq("userId", user._id).eq("listingId", listingId)
    ).unique();
    if (savedListing) {
      await ctx.db.delete(savedListing._id);
      return { success: true, wasRemoved: true };
    }
    return { success: true, wasRemoved: false };
  }
});
var isListingSaved = query({
  args: { listingId: v2.id("listings") },
  handler: async (ctx, { listingId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }
    const user = await getCurrentUser(ctx);
    if (!user) {
      return false;
    }
    const savedListing = await ctx.db.query("savedListings").withIndex(
      "by_user_and_listing",
      (q) => q.eq("userId", user._id).eq("listingId", listingId)
    ).unique();
    return savedListing !== null;
  }
});
var getUserSavedListings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }
    const savedListings = await ctx.db.query("savedListings").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    const listingsWithDetails = await Promise.all(
      savedListings.map(async (saved) => {
        const listing = await ctx.db.get(saved.listingId);
        return listing ? {
          ...saved,
          listing: toPublicListing(listing)
        } : null;
      })
    );
    return listingsWithDetails.filter((item) => item !== null);
  }
});
var getStateListingStats = query({
  args: { state: v2.string() },
  handler: async (ctx, { state }) => {
    const allListings = await ctx.db.query("listings").collect();
    const stateListings = allListings.filter(
      (listing) => listing.isActive === true && listing.state.toLowerCase() === state.toLowerCase()
    );
    return {
      totalListings: stateListings.length,
      buyerListings: stateListings.filter((l) => l.listingType === "buyer").length,
      sellerListings: stateListings.filter((l) => l.listingType === "seller").length
    };
  }
});

// convex/subscriptions.ts
import { Polar } from "@polar-sh/sdk";
import { v as v3 } from "convex/values";
import { Webhook, WebhookVerificationError } from "standardwebhooks";

// convex/_generated/api.js
import { anyApi, componentsGeneric } from "convex/server";
var api = anyApi;
var internal = anyApi;
var components = componentsGeneric();

// convex/subscriptions.ts
function getPolarServer() {
  return process.env.POLAR_SERVER || "sandbox";
}
function createPolarClient() {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    throw new Error("POLAR_ACCESS_TOKEN is not configured");
  }
  return new Polar({
    server: getPolarServer(),
    accessToken: process.env.POLAR_ACCESS_TOKEN
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
        interval: price.recurringInterval
      }))
    })),
    pagination: result.pagination
  };
}
async function createCheckout({
  customerEmail,
  productPriceId,
  successUrl,
  metadata
}) {
  const polar = createPolarClient();
  if (!process.env.POLAR_ORGANIZATION_ID) {
    throw new Error("POLAR_ORGANIZATION_ID is not configured");
  }
  const { result: productsResult } = await polar.products.list({
    organizationId: process.env.POLAR_ORGANIZATION_ID,
    isArchived: false
  });
  let productId = null;
  for (const product of productsResult.items) {
    const hasPrice = product.prices.some(
      (price) => price.id === productPriceId
    );
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
      priceId: productPriceId
    }
  });
  return result;
}
async function listSubscriptionsForUserIdentifiers(ctx, identifiers) {
  const uniqueById = /* @__PURE__ */ new Map();
  for (const identifier of identifiers) {
    const subscriptions = await ctx.db.query("subscriptions").withIndex("userId", (q) => q.eq("userId", identifier)).collect();
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
  return subscriptions.find((subscription) => subscription.status === "active") ?? subscriptions[0] ?? null;
}
function buildSubscriptionFields(data, canonicalUserId) {
  return {
    polarId: data.id,
    polarPriceId: data.price_id,
    currency: data.currency,
    interval: data.recurring_interval,
    userId: canonicalUserId ?? data.metadata?.userId,
    status: data.status,
    currentPeriodStart: data.current_period_start ? new Date(data.current_period_start).getTime() : void 0,
    currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end).getTime() : void 0,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    amount: data.amount,
    startedAt: data.started_at ? new Date(data.started_at).getTime() : void 0,
    endedAt: data.ended_at ? new Date(data.ended_at).getTime() : void 0,
    canceledAt: data.canceled_at ? new Date(data.canceled_at).getTime() : void 0,
    customerCancellationReason: data.customer_cancellation_reason || void 0,
    customerCancellationComment: data.customer_cancellation_comment || void 0,
    metadata: data.metadata || {},
    customFieldData: data.custom_field_data || {},
    customerId: data.customer_id
  };
}
async function resolveCanonicalSubscriptionUserId(ctx, rawUserId) {
  if (!rawUserId) {
    return void 0;
  }
  const user = await findUserByIdentifier(ctx, rawUserId);
  return user?.tokenIdentifier ?? rawUserId;
}
async function upsertSubscriptionByPolarId(ctx, data, canonicalUserId) {
  const existingSubscriptions = data.id ? await ctx.db.query("subscriptions").withIndex("polarId", (q) => q.eq("polarId", data.id)).collect() : [];
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
var getAvailablePlansQuery = query({
  handler: async () => {
    if (!process.env.POLAR_ORGANIZATION_ID) {
      throw new Error("POLAR_ORGANIZATION_ID is not configured");
    }
    const polar = createPolarClient();
    const { result } = await polar.products.list({
      organizationId: process.env.POLAR_ORGANIZATION_ID,
      isArchived: false
    });
    return serializePlans(result);
  }
});
var getAvailablePlans = action({
  handler: async () => {
    if (!process.env.POLAR_ORGANIZATION_ID) {
      throw new Error("POLAR_ORGANIZATION_ID is not configured");
    }
    const polar = createPolarClient();
    const { result } = await polar.products.list({
      organizationId: process.env.POLAR_ORGANIZATION_ID,
      isArchived: false
    });
    return serializePlans(result);
  }
});
var createCheckoutSession = action({
  args: {
    priceId: v3.string()
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
        userId: user.tokenIdentifier
      }
    });
    return checkout.url;
  }
});
var checkUserSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const identifiers = await getAuthenticatedUserIdentifiers(ctx);
    if (!identifiers) {
      return { hasActiveSubscription: false };
    }
    const subscriptions = await listSubscriptionsForUserIdentifiers(
      ctx,
      [identifiers.tokenIdentifier, identifiers.subject ?? ""].filter(Boolean)
    );
    const activeSubscription = subscriptions.find(
      (subscription) => subscription.status === "active"
    );
    return {
      hasActiveSubscription: Boolean(activeSubscription)
    };
  }
});
var fetchUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identifiers = await getAuthenticatedUserIdentifiers(ctx);
    if (!identifiers) {
      return null;
    }
    const subscriptions = await listSubscriptionsForUserIdentifiers(
      ctx,
      [identifiers.tokenIdentifier, identifiers.subject ?? ""].filter(Boolean)
    );
    return pickPrimarySubscription(subscriptions);
  }
});
var handleWebhookEvent = mutation({
  args: {
    polarEventId: v3.string(),
    body: v3.any()
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db.query("webhookEvents").withIndex("polarEventId", (q) => q.eq("polarEventId", args.polarEventId)).first();
    if (existingEvent) {
      return { duplicate: true };
    }
    const eventType = args.body.type;
    const eventData = args.body.data ?? {};
    const canonicalUserId = await resolveCanonicalSubscriptionUserId(
      ctx,
      eventData.metadata?.userId
    );
    await ctx.db.insert("webhookEvents", {
      type: eventType,
      polarEventId: args.polarEventId,
      createdAt: eventData.created_at ?? (/* @__PURE__ */ new Date()).toISOString(),
      modifiedAt: eventData.modified_at ?? eventData.created_at ?? (/* @__PURE__ */ new Date()).toISOString(),
      data: args.body
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
  }
});
var validateEvent = (body, headers, secret) => {
  const base64Secret = btoa(secret);
  const webhook = new Webhook(base64Secret);
  webhook.verify(body, headers);
};
var paymentWebhook = httpAction(async (ctx, request) => {
  try {
    const rawBody = await request.text();
    const headers = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    if (!process.env.POLAR_WEBHOOK_SECRET) {
      throw new Error(
        "POLAR_WEBHOOK_SECRET environment variable is not configured"
      );
    }
    validateEvent(rawBody, headers, process.env.POLAR_WEBHOOK_SECRET);
    const body = JSON.parse(rawBody);
    const polarEventId = headers["webhook-id"] ?? body.id ?? `${body.type}:${body.data?.id ?? "unknown"}`;
    await ctx.runMutation(api.subscriptions.handleWebhookEvent, {
      polarEventId,
      body
    });
    return new Response(JSON.stringify({ message: "Webhook received!" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new Response(
        JSON.stringify({ message: "Webhook verification failed" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    return new Response(JSON.stringify({ message: "Webhook failed" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
var createCustomerPortalUrl = action({
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
        customerId: subscription.customerId
      });
      return { url: result.customerPortalUrl };
    } catch (error) {
      console.error("Error creating customer session:", error);
      throw new Error("Failed to create customer session");
    }
  }
});

// convex/cartesia/sessionState.ts
import { v as v4 } from "convex/values";
var SESSION_ID_PATTERN = /^[a-zA-Z0-9:_-]{8,128}$/;
function assertValidSessionId(sessionId) {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error("Invalid session ID");
  }
}
function requireBridgeToken(bridgeToken) {
  if (!process.env.CARTESIA_BRIDGE_SECRET) {
    throw new Error("CARTESIA_BRIDGE_SECRET is not configured");
  }
  if (bridgeToken !== process.env.CARTESIA_BRIDGE_SECRET) {
    throw new Error("Invalid Cartesia bridge token");
  }
}
var registerSession = mutation({
  args: {
    sessionId: v4.string()
  },
  handler: async (ctx, args) => {
    assertValidSessionId(args.sessionId);
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const existing = await ctx.db.query("cartesiaSessions").withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (existing) {
      if (existing.ownerTokenIdentifier !== identity.tokenIdentifier) {
        throw new Error("Session is already owned by another user");
      }
      await ctx.db.patch(existing._id, {
        updateType: "registered",
        data: "{}",
        updatedAt: now,
        version: 0
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
      version: 0
    });
    return { sessionId: args.sessionId };
  }
});
var pushUpdate = mutation({
  args: {
    sessionId: v4.string(),
    updateType: v4.string(),
    data: v4.string(),
    bridgeToken: v4.string()
  },
  handler: async (ctx, args) => {
    assertValidSessionId(args.sessionId);
    requireBridgeToken(args.bridgeToken);
    const existing = await ctx.db.query("cartesiaSessions").withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (!existing) {
      throw new Error("Cartesia session not registered");
    }
    await ctx.db.patch(existing._id, {
      updateType: args.updateType,
      data: args.data,
      updatedAt: Date.now(),
      version: existing.version + 1
    });
  }
});
var getLatestUpdate = query({
  args: {
    sessionId: v4.string()
  },
  returns: v4.union(
    v4.object({
      updateType: v4.string(),
      data: v4.string(),
      version: v4.number(),
      updatedAt: v4.number()
    }),
    v4.null()
  ),
  handler: async (ctx, args) => {
    assertValidSessionId(args.sessionId);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const session = await ctx.db.query("cartesiaSessions").withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (!session) {
      return null;
    }
    if (session.ownerTokenIdentifier !== identity.tokenIdentifier && !isAdminIdentity(identity)) {
      return null;
    }
    if (session.version === 0) {
      return null;
    }
    return {
      updateType: session.updateType,
      data: session.data,
      version: session.version,
      updatedAt: session.updatedAt
    };
  }
});
var clearSession = mutation({
  args: {
    sessionId: v4.string()
  },
  handler: async (ctx, args) => {
    assertValidSessionId(args.sessionId);
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db.query("cartesiaSessions").withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (!existing) {
      return;
    }
    if (existing.ownerTokenIdentifier !== identity.tokenIdentifier && !isAdminIdentity(identity)) {
      throw new Error("Not authorized to clear this Cartesia session");
    }
    await ctx.db.delete(existing._id);
  }
});

// convex/seedListings.ts
import { v as v5 } from "convex/values";
import ngeohash from "ngeohash";

// shared/constants/priceOptions.ts
var PRICE_OPTIONS = [
  { value: 5e5, label: "$500,000" },
  { value: 6e5, label: "$600,000" },
  { value: 7e5, label: "$700,000" },
  { value: 8e5, label: "$800,000" },
  { value: 9e5, label: "$900,000" },
  { value: 1e6, label: "$1,000,000" },
  { value: 125e4, label: "$1,250,000" },
  { value: 15e5, label: "$1,500,000" },
  { value: 175e4, label: "$1,750,000" },
  { value: 2e6, label: "$2,000,000" },
  { value: 25e5, label: "$2,500,000" },
  { value: 3e6, label: "$3,000,000" },
  { value: 35e5, label: "$3,500,000" },
  { value: 4e6, label: "$4,000,000" },
  { value: 5e6, label: "$5,000,000" }
];

// convex/seedListings.ts
var SUBURBS = [
  // NSW Suburbs
  {
    suburb: "Bondi",
    state: "NSW",
    postcode: "2026",
    lat: -33.8908,
    lng: 151.2743
  },
  {
    suburb: "Edgecliff",
    state: "NSW",
    postcode: "2027",
    lat: -33.87924,
    lng: 151.23614
  },
  {
    suburb: "Paddington",
    state: "NSW",
    postcode: "2021",
    lat: -33.88416,
    lng: 151.22728
  },
  {
    suburb: "Double Bay",
    state: "NSW",
    postcode: "2028",
    lat: -33.87664,
    lng: 151.24245
  },
  {
    suburb: "Potts Point",
    state: "NSW",
    postcode: "2029",
    lat: -33.88151,
    lng: 151.24355
  },
  // VIC Suburbs
  {
    suburb: "Toorak",
    state: "VIC",
    postcode: "3142",
    lat: -37.8416,
    lng: 145.0176
  },
  {
    suburb: "Richmond",
    state: "VIC",
    postcode: "3121",
    lat: -37.8204,
    lng: 145.00252
  },
  {
    suburb: "West Footscray",
    state: "VIC",
    postcode: "3012",
    lat: -37.80174,
    lng: 144.88407
  },
  {
    suburb: "South Yarra",
    state: "VIC",
    postcode: "3141",
    lat: -37.8389,
    lng: 144.9922
  },
  {
    suburb: "Hawthorn",
    state: "VIC",
    postcode: "3122",
    lat: -37.82442,
    lng: 145.03172
  },
  {
    suburb: "Cremorne",
    state: "VIC",
    postcode: "3121",
    lat: -37.8318,
    lng: 144.9938
  },
  {
    suburb: "Melbourne",
    state: "VIC",
    postcode: "3000",
    lat: -37.81425,
    lng: 144.96317
  },
  // QLD Suburbs
  {
    suburb: "Paddington",
    state: "QLD",
    postcode: "4064",
    lat: -27.4598,
    lng: 153.0082
  },
  {
    suburb: "Brisbane",
    state: "QLD",
    postcode: "4000",
    lat: -27.46897,
    lng: 153.0235
  },
  // Other States
  {
    suburb: "Cottesloe",
    state: "WA",
    postcode: "6011",
    lat: -31.9959,
    lng: 115.7581
  },
  {
    suburb: "Perth",
    state: "WA",
    postcode: "6000",
    lat: -31.95589,
    lng: 115.86059
  },
  {
    suburb: "Unley",
    state: "SA",
    postcode: "5061",
    lat: -34.9447,
    lng: 138.6056
  },
  {
    suburb: "Adelaide",
    state: "SA",
    postcode: "5000",
    lat: -34.92818,
    lng: 138.59993
  }
];
var BUILDING_TYPES2 = ["House", "Apartment", "Townhouse", "Villa", "Unit"];
var FEATURES2 = [
  "CornerBlock",
  "EnsuiteBathroom",
  "MatureGarden",
  "LockUpGarage",
  "Pool",
  "SolarPanels",
  "RenovatedKitchen",
  "AirConditioning",
  "HighCeilings",
  "WaterViews",
  "StudyRoom",
  "OpenPlanLiving",
  "SecuritySystem",
  "EnergyEfficient",
  "NorthFacing",
  "PetFriendly",
  "WheelchairAccessible",
  "SmartHome",
  "Fireplace",
  "WalkInWardrobe",
  "LanewayAccess",
  "Bungalow",
  "DualLiving",
  "GrannyFlat",
  "HeritageListed",
  "RainwaterTank",
  "DoubleGlazedWindows",
  "HomeTheatre",
  "WineCellar",
  "OutdoorKitchen"
];
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function randomFeatures(count = 3) {
  const shuffled = [...FEATURES2].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
function randomPrice() {
  const priceValues = PRICE_OPTIONS.map((option) => option.value);
  const minIndex = Math.floor(Math.random() * (priceValues.length - 3));
  const min = priceValues[minIndex];
  const maxStartIndex = minIndex + 1 + Math.floor(Math.random() * 3);
  const maxIndex = Math.min(maxStartIndex, priceValues.length - 1);
  const max = priceValues[maxIndex];
  return { min, max };
}
var createSeedListing = internalMutation({
  args: {
    listing: v5.object({
      listingType: v5.union(v5.literal("buyer"), v5.literal("seller")),
      userId: v5.id("users"),
      suburb: v5.string(),
      state: v5.string(),
      postcode: v5.string(),
      address: v5.optional(v5.string()),
      latitude: v5.number(),
      longitude: v5.number(),
      geohash: v5.string(),
      buildingType: v5.union(
        v5.literal("House"),
        v5.literal("Apartment"),
        v5.literal("Townhouse"),
        v5.literal("Villa"),
        v5.literal("Unit")
      ),
      bedrooms: v5.number(),
      bathrooms: v5.number(),
      parking: v5.number(),
      priceMin: v5.number(),
      priceMax: v5.number(),
      features: v5.array(
        v5.union(
          v5.literal("CornerBlock"),
          v5.literal("EnsuiteBathroom"),
          v5.literal("MatureGarden"),
          v5.literal("LockUpGarage"),
          v5.literal("Pool"),
          v5.literal("SolarPanels"),
          v5.literal("RenovatedKitchen"),
          v5.literal("AirConditioning"),
          v5.literal("HighCeilings"),
          v5.literal("WaterViews"),
          v5.literal("StudyRoom"),
          v5.literal("OpenPlanLiving"),
          v5.literal("SecuritySystem"),
          v5.literal("EnergyEfficient"),
          v5.literal("NorthFacing"),
          v5.literal("PetFriendly"),
          v5.literal("WheelchairAccessible"),
          v5.literal("SmartHome"),
          v5.literal("Fireplace"),
          v5.literal("WalkInWardrobe"),
          v5.literal("LanewayAccess"),
          v5.literal("Bungalow"),
          v5.literal("DualLiving"),
          v5.literal("GrannyFlat"),
          v5.literal("HeritageListed"),
          v5.literal("RainwaterTank"),
          v5.literal("DoubleGlazedWindows"),
          v5.literal("HomeTheatre"),
          v5.literal("WineCellar"),
          v5.literal("OutdoorKitchen")
        )
      ),
      buyerType: v5.optional(v5.union(v5.literal("street"), v5.literal("suburb"))),
      searchRadius: v5.optional(v5.number()),
      sellerType: v5.optional(
        v5.union(v5.literal("sale"), v5.literal("offmarket"))
      ),
      headline: v5.string(),
      description: v5.string(),
      images: v5.optional(v5.array(v5.string())),
      contactEmail: v5.optional(v5.string()),
      contactPhone: v5.optional(v5.string()),
      isActive: v5.boolean(),
      isPremium: v5.optional(v5.boolean()),
      sample: v5.optional(v5.boolean()),
      createdAt: v5.number(),
      updatedAt: v5.number()
    })
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("listings", args.listing);
  }
});
var createSeedUser = internalMutation({
  args: {
    email: v5.string(),
    name: v5.string(),
    tokenIdentifier: v5.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      tokenIdentifier: args.tokenIdentifier
    });
  }
});
var seedListings = action({
  args: {
    userCount: v5.optional(v5.number()),
    listingCount: v5.optional(v5.number())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const userCount = args.userCount ?? 10;
    const listingCount = args.listingCount ?? 200;
    const userIds = [];
    for (let i = 0; i < userCount; i++) {
      const userId = await ctx.runMutation(internal.seedListings.createSeedUser, {
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`,
        tokenIdentifier: `seed_user_${i + 1}`
      });
      userIds.push(userId);
    }
    const matchPairCount = Math.floor(listingCount * 0.15);
    const randomListingCount = listingCount - matchPairCount * 2;
    for (let i = 0; i < matchPairCount; i++) {
      const location = getRandomElement(SUBURBS);
      const buildingType = getRandomElement(BUILDING_TYPES2);
      const features = randomFeatures(Math.floor(Math.random() * 4) + 2);
      const price = randomPrice();
      const now = Date.now();
      const baseLatVariation = (Math.random() - 0.5) * 0.01;
      const baseLngVariation = (Math.random() - 0.5) * 0.01;
      const baseLat = location.lat + baseLatVariation;
      const baseLng = location.lng + baseLngVariation;
      const buyerGeohash = ngeohash.encode(baseLat, baseLng, 7);
      const buyerType = Math.random() < 0.6 ? "suburb" : "street";
      await ctx.runMutation(internal.seedListings.createSeedListing, {
        listing: {
          listingType: "buyer",
          userId: getRandomElement(userIds),
          suburb: location.suburb,
          state: location.state,
          postcode: location.postcode,
          latitude: baseLat,
          longitude: baseLng,
          geohash: buyerGeohash,
          buildingType,
          bedrooms: Math.floor(Math.random() * 4) + 1,
          bathrooms: Math.floor(Math.random() * 3) + 1,
          parking: Math.floor(Math.random() * 3),
          priceMin: price.min,
          priceMax: price.max,
          features,
          buyerType,
          searchRadius: buyerType === "street" ? Math.floor(Math.random() * 5) + 1 : void 0,
          headline: `Looking for ${buildingType} in ${location.suburb}`,
          description: `Seeking a quality ${buildingType} in ${location.suburb}. Features wanted: ${features.slice(0, 2).join(", ")}.`,
          images: [],
          isActive: true,
          isPremium: Math.random() < 0.2,
          sample: true,
          createdAt: now,
          updatedAt: now
        }
      });
      const sellerLatVariation = (Math.random() - 0.5) * 5e-3;
      const sellerLngVariation = (Math.random() - 0.5) * 5e-3;
      const sellerLat = baseLat + sellerLatVariation;
      const sellerLng = baseLng + sellerLngVariation;
      const sellerGeohash = ngeohash.encode(sellerLat, sellerLng, 7);
      const streetNum = Math.floor(Math.random() * 200) + 1;
      await ctx.runMutation(internal.seedListings.createSeedListing, {
        listing: {
          listingType: "seller",
          userId: getRandomElement(userIds),
          suburb: location.suburb,
          state: location.state,
          postcode: location.postcode,
          address: `${streetNum} Main Street, ${location.suburb} ${location.state} ${location.postcode}`,
          latitude: sellerLat,
          longitude: sellerLng,
          geohash: sellerGeohash,
          buildingType,
          bedrooms: Math.floor(Math.random() * 4) + 1,
          bathrooms: Math.floor(Math.random() * 3) + 1,
          parking: Math.floor(Math.random() * 3),
          priceMin: price.min,
          // Same price range for potential match
          priceMax: price.max,
          features,
          // Same features the buyer wants
          sellerType: Math.random() < 0.8 ? "sale" : "offmarket",
          headline: `Beautiful ${buildingType} in ${location.suburb}`,
          description: `Stunning ${buildingType} for sale in ${location.suburb}. Features: ${features.join(", ")}.`,
          images: [],
          contactEmail: `seller${i}@example.com`,
          contactPhone: `04${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`,
          isActive: true,
          isPremium: Math.random() < 0.3,
          sample: true,
          createdAt: now,
          updatedAt: now
        }
      });
    }
    for (let i = 0; i < randomListingCount; i++) {
      const location = getRandomElement(SUBURBS);
      const buildingType = getRandomElement(BUILDING_TYPES2);
      const features = randomFeatures(Math.floor(Math.random() * 4) + 2);
      const price = randomPrice();
      const isBuyer = Math.random() < 0.5;
      const now = Date.now();
      const latVariation = (Math.random() - 0.5) * 0.01;
      const lngVariation = (Math.random() - 0.5) * 0.01;
      const lat = location.lat + latVariation;
      const lng = location.lng + lngVariation;
      const geohash = ngeohash.encode(lat, lng, 7);
      const baseListing = {
        listingType: isBuyer ? "buyer" : "seller",
        userId: getRandomElement(userIds),
        suburb: location.suburb,
        state: location.state,
        postcode: location.postcode,
        latitude: lat,
        longitude: lng,
        geohash,
        buildingType,
        bedrooms: Math.floor(Math.random() * 4) + 1,
        bathrooms: Math.floor(Math.random() * 3) + 1,
        parking: Math.floor(Math.random() * 3),
        priceMin: price.min,
        priceMax: price.max,
        features,
        headline: isBuyer ? `Looking for ${buildingType} in ${location.suburb}` : `Beautiful ${buildingType} in ${location.suburb}`,
        description: isBuyer ? `Seeking a quality ${buildingType} in ${location.suburb}. Features wanted: ${features.slice(0, 2).join(", ")}.` : `Stunning ${buildingType} for sale in ${location.suburb}. Features: ${features.join(", ")}.`,
        images: [],
        isActive: true,
        isPremium: Math.random() < 0.2,
        sample: true,
        createdAt: now,
        updatedAt: now
      };
      if (isBuyer) {
        const buyerType = Math.random() < 0.7 ? "suburb" : "street";
        await ctx.runMutation(internal.seedListings.createSeedListing, {
          listing: {
            ...baseListing,
            buyerType,
            searchRadius: buyerType === "street" ? Math.floor(Math.random() * 5) + 1 : void 0
          }
        });
      } else {
        const streetNum = Math.floor(Math.random() * 200) + 1;
        await ctx.runMutation(internal.seedListings.createSeedListing, {
          listing: {
            ...baseListing,
            address: `${streetNum} Main Street, ${location.suburb} ${location.state} ${location.postcode}`,
            sellerType: Math.random() < 0.8 ? "sale" : "offmarket",
            contactEmail: `seller${i + matchPairCount}@example.com`,
            contactPhone: `04${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`
          }
        });
      }
    }
    return {
      success: true,
      message: `Created ${userCount} users and ${listingCount} listings`
    };
  }
});
var deleteSampleData = action({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const listings = await ctx.runQuery(api.listings.listListingsAdmin, {
      page: 1,
      pageSize: 1e4
    });
    let deletedListings = 0;
    for (const listing of listings.listings) {
      if (listing.sample) {
        await ctx.runMutation(api.listings.deleteListing, { id: listing._id });
        deletedListings++;
      }
    }
    const users = await ctx.runQuery(api.users.listAllUsers, {});
    let deletedUsers = 0;
    for (const user of users) {
      if (user.tokenIdentifier.startsWith("seed_user_")) {
        await ctx.runMutation(api.users.deleteUser, { id: user._id });
        deletedUsers++;
      }
    }
    return {
      success: true,
      deletedListings,
      deletedUsers
    };
  }
});
var deleteAllListings = action({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const result = await ctx.runMutation(api.listings.clearAllListings, {});
    return {
      success: true,
      message: `Deleted ${result.cleared} listings`,
      deletedListings: result.cleared
    };
  }
});

// tests/hardening.test.ts
function getHandler(fn) {
  return fn._handler;
}
function createIdentity(overrides = {}) {
  return {
    tokenIdentifier: "token-user-1",
    subject: "user_1",
    email: "user@example.com",
    name: "Test User",
    pictureUrl: "https://example.com/avatar.png",
    role: void 0,
    roles: void 0,
    isAdmin: false,
    sessionClaims: {},
    ...overrides
  };
}
function createAuth(identity) {
  return {
    getUserIdentity: async () => identity
  };
}
function createMutationCtx(db, identity) {
  return {
    db,
    auth: createAuth(identity),
    runMutation: async () => {
      throw new Error("Nested runMutation not implemented in tests");
    }
  };
}
function createEqBuilder() {
  const filters = [];
  const builder = {
    eq(field, value) {
      filters.push({ field, value });
      return builder;
    }
  };
  return { builder, filters };
}
var MockDb = class {
  tables = {
    users: /* @__PURE__ */ new Map(),
    listings: /* @__PURE__ */ new Map(),
    savedListings: /* @__PURE__ */ new Map(),
    subscriptions: /* @__PURE__ */ new Map(),
    webhookEvents: /* @__PURE__ */ new Map(),
    cartesiaSessions: /* @__PURE__ */ new Map()
  };
  counter = 0;
  time = 171e10;
  insert(table, value) {
    const _id = `${table}:${++this.counter}`;
    const doc = {
      _id,
      _creationTime: this.time++,
      ...value
    };
    this.tables[table].set(_id, doc);
    return _id;
  }
  async get(id) {
    const table = this.getTableName(id);
    if (!table) {
      return null;
    }
    return this.tables[table].get(id) ?? null;
  }
  async patch(id, value) {
    const table = this.getTableName(id);
    if (!table) {
      throw new Error(`Unknown table for id ${id}`);
    }
    const existing = this.tables[table].get(id);
    if (!existing) {
      throw new Error(`Missing document ${id}`);
    }
    this.tables[table].set(id, {
      ...existing,
      ...value
    });
  }
  async delete(id) {
    const table = this.getTableName(id);
    if (!table) {
      throw new Error(`Unknown table for id ${id}`);
    }
    this.tables[table].delete(id);
  }
  query(table) {
    const getDocs = () => [...this.tables[table].values()];
    return {
      withIndex: (_indexName, build) => {
        const { builder, filters } = createEqBuilder();
        build(builder);
        const filtered = () => getDocs().filter(
          (doc) => filters.every(
            ({ field, value }) => doc[field] === value
          )
        );
        return {
          collect: async () => filtered(),
          first: async () => filtered()[0] ?? null,
          unique: async () => {
            const results = filtered();
            assert.ok(
              results.length <= 1,
              `Expected unique result, received ${results.length}`
            );
            return results[0] ?? null;
          }
        };
      },
      collect: async () => getDocs()
    };
  }
  list(table) {
    return [...this.tables[table].values()];
  }
  getTableName(id) {
    const [table] = id.split(":");
    switch (table) {
      case "users":
      case "listings":
      case "savedListings":
      case "subscriptions":
      case "webhookEvents":
      case "cartesiaSessions":
        return table;
      default:
        return null;
    }
  }
};
function withEnv(patch, run) {
  const previous = /* @__PURE__ */ new Map();
  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, process.env[key]);
    if (value === void 0) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return run().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value === void 0) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}
test("listing reads stay safe before a users row exists", async () => {
  const db = new MockDb();
  const listingId = db.insert("listings", {
    userId: "users:missing",
    headline: "Hidden listing"
  });
  const identity = createIdentity();
  const listMyListingsHandler = getHandler(listMyListings);
  const getListingForEditHandler = getHandler(getListingForEdit);
  const listResult = await listMyListingsHandler(
    { db, auth: createAuth(identity) },
    {}
  );
  assert.deepEqual(listResult.listings, []);
  assert.equal(listResult.pagination.totalCount, 0);
  const editResult = await getListingForEditHandler(
    { db, auth: createAuth(identity) },
    { id: listingId }
  );
  assert.equal(editResult, null);
});
test("subscription reads fall back to authenticated identifiers before bootstrap", async () => {
  const db = new MockDb();
  const identity = createIdentity({
    tokenIdentifier: "token-subscription-user",
    subject: "clerk-user-42"
  });
  db.insert("subscriptions", {
    userId: identity.tokenIdentifier,
    status: "active",
    amount: 9900,
    currency: "usd",
    customerId: "cus_123",
    currentPeriodEnd: 1710000123e3
  });
  const statusHandler = getHandler(checkUserSubscriptionStatus);
  const fetchHandler = getHandler(fetchUserSubscription);
  const status = await statusHandler({ db, auth: createAuth(identity) }, {});
  assert.equal(status.hasActiveSubscription, true);
  const subscription = await fetchHandler(
    { db, auth: createAuth(identity) },
    {}
  );
  assert.equal(subscription?.customerId, "cus_123");
  assert.equal(subscription?.userId, identity.tokenIdentifier);
});
test("saved listings work for canonical and legacy user identity matches", async (t) => {
  const saveListingHandler = getHandler(saveListing);
  const isListingSavedHandler = getHandler(isListingSaved);
  await t.test("canonical tokenIdentifier lookup", async () => {
    const db = new MockDb();
    const identity = createIdentity({
      tokenIdentifier: "token-canonical",
      subject: "user-canonical"
    });
    db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      subject: identity.subject,
      email: identity.email,
      name: identity.name,
      image: identity.pictureUrl
    });
    await saveListingHandler(
      createMutationCtx(db, identity),
      { listingId: "listings:canonical" }
    );
    const saved = await isListingSavedHandler(
      { db, auth: createAuth(identity) },
      { listingId: "listings:canonical" }
    );
    assert.equal(saved, true);
  });
  await t.test("legacy subject fallback upgrades tokenIdentifier", async () => {
    const db = new MockDb();
    const identity = createIdentity({
      tokenIdentifier: "token-upgraded",
      subject: "legacy-subject"
    });
    const userId = db.insert("users", {
      tokenIdentifier: "old-token",
      subject: identity.subject,
      email: "legacy@example.com",
      name: "Legacy User",
      image: void 0
    });
    await saveListingHandler(
      createMutationCtx(db, identity),
      { listingId: "listings:legacy" }
    );
    const upgradedUser = await db.get(userId);
    assert.equal(upgradedUser?.tokenIdentifier, identity.tokenIdentifier);
    const saved = await isListingSavedHandler(
      { db, auth: createAuth(identity) },
      { listingId: "listings:legacy" }
    );
    assert.equal(saved, true);
  });
});
test("admin-only listing and seed endpoints reject non-admin users", async (t) => {
  const identity = createIdentity({ email: "member@example.com" });
  const auth = createAuth(identity);
  await withEnv(
    {
      ADMIN_EMAIL_ALLOWLIST: "admin@example.com",
      ADMIN_USER_ID_ALLOWLIST: void 0,
      ADMIN_TOKEN_IDENTIFIER_ALLOWLIST: void 0
    },
    async () => {
      const handlers = [
        ["listListingsAdmin", getHandler(listListingsAdmin), {}],
        ["getAllListingsDebug", getHandler(getAllListingsDebug), {}],
        ["clearAllListings", getHandler(clearAllListings), {}],
        ["seedListings", getHandler(seedListings), {}],
        ["deleteSampleData", getHandler(deleteSampleData), {}],
        ["deleteAllListings", getHandler(deleteAllListings), {}]
      ];
      for (const [name, handler, args] of handlers) {
        await t.test(name, async () => {
          await assert.rejects(
            () => handler({ auth }, args),
            /Admin access required/
          );
        });
      }
    }
  );
});
test("webhook dedupe keeps subscription effects idempotent", async () => {
  const db = new MockDb();
  db.insert("users", {
    tokenIdentifier: "canonical-token",
    subject: "legacy-subject",
    email: "buyer@example.com",
    name: "Buyer",
    image: void 0
  });
  const handler = getHandler(handleWebhookEvent);
  const body = {
    type: "subscription.created",
    data: {
      id: "sub_123",
      price_id: "price_123",
      currency: "usd",
      recurring_interval: "month",
      metadata: {
        userId: "legacy-subject"
      },
      status: "active",
      created_at: "2026-04-01T00:00:00.000Z",
      modified_at: "2026-04-01T00:00:00.000Z",
      customer_id: "cus_123",
      amount: 9900
    }
  };
  const first = await handler({ db }, { polarEventId: "evt_123", body });
  assert.deepEqual(first, { duplicate: false });
  const second = await handler({ db }, { polarEventId: "evt_123", body });
  assert.deepEqual(second, { duplicate: true });
  assert.equal(db.list("webhookEvents").length, 1);
  assert.equal(db.list("subscriptions").length, 1);
  assert.equal(db.list("subscriptions")[0]?.userId, "canonical-token");
});
test("customer portal creation is still auth-gated", async () => {
  const handler = getHandler(createCustomerPortalUrl);
  await assert.rejects(
    () => handler({ auth: createAuth(null) }, {}),
    /Not authenticated/
  );
});
test("Cartesia session ownership and bridge token protections hold", async () => {
  const registerHandler = getHandler(registerSession);
  const pushHandler = getHandler(pushUpdate);
  const latestHandler = getHandler(getLatestUpdate);
  const clearHandler = getHandler(clearSession);
  await withEnv(
    {
      CARTESIA_BRIDGE_SECRET: "bridge-secret"
    },
    async () => {
      const db = new MockDb();
      const owner = createIdentity({
        tokenIdentifier: "token-owner",
        subject: "owner"
      });
      const intruder = createIdentity({
        tokenIdentifier: "token-intruder",
        subject: "intruder",
        email: "intruder@example.com"
      });
      const sessionId = "session_12345678";
      await registerHandler({ db, auth: createAuth(owner) }, { sessionId });
      await assert.rejects(
        () => registerHandler({ db, auth: createAuth(intruder) }, { sessionId }),
        /Session is already owned by another user/
      );
      await assert.rejects(
        () => pushHandler({
          db
        }, {
          sessionId,
          updateType: "selection",
          data: '{"step":1}',
          bridgeToken: "wrong-secret"
        }),
        /Invalid Cartesia bridge token/
      );
      await pushHandler(
        { db },
        {
          sessionId,
          updateType: "selection",
          data: '{"step":1}',
          bridgeToken: "bridge-secret"
        }
      );
      const ownerUpdate = await latestHandler(
        { db, auth: createAuth(owner) },
        { sessionId }
      );
      assert.equal(ownerUpdate?.version, 1);
      assert.equal(ownerUpdate?.updateType, "selection");
      const intruderUpdate = await latestHandler(
        { db, auth: createAuth(intruder) },
        { sessionId }
      );
      assert.equal(intruderUpdate, null);
      await assert.rejects(
        () => clearHandler({ db, auth: createAuth(intruder) }, { sessionId }),
        /Not authorized to clear this Cartesia session/
      );
      await clearHandler({ db, auth: createAuth(owner) }, { sessionId });
      assert.equal(db.list("cartesiaSessions").length, 0);
    }
  );
});
