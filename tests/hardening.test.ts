import assert from "node:assert/strict";
import { test } from "node:test";
import {
	clearAllListings,
	getAllListingsDebug,
	getListingForEdit,
	isListingSaved,
	listListingsAdmin,
	listMyListings,
	saveListing,
} from "../convex/listings";
import {
	checkUserSubscriptionStatus,
	createCustomerPortalUrl,
	fetchUserSubscription,
	handleWebhookEvent,
} from "../convex/subscriptions";
import {
	clearSession,
	getLatestUpdate,
	pushUpdate,
	registerSession,
} from "../convex/cartesia/sessionState";
import {
	deleteAllListings,
	deleteSampleData,
	seedListings,
} from "../convex/seedListings";

type TableName =
	| "users"
	| "listings"
	| "savedListings"
	| "subscriptions"
	| "webhookEvents"
	| "cartesiaSessions";

type AnyDoc = {
	_id: string;
	_creationTime: number;
	[key: string]: unknown;
};

type IdentityLike = {
	tokenIdentifier: string;
	subject: string;
	email?: string;
	name?: string;
	pictureUrl?: string;
	role?: unknown;
	roles?: unknown;
	isAdmin?: unknown;
	sessionClaims?: unknown;
};

function getHandler<T extends (...args: any[]) => any>(fn: unknown): T {
	return (fn as { _handler: T })._handler;
}

function createIdentity(overrides: Partial<IdentityLike> = {}): IdentityLike {
	return {
		tokenIdentifier: "token-user-1",
		subject: "user_1",
		email: "user@example.com",
		name: "Test User",
		pictureUrl: "https://example.com/avatar.png",
		role: undefined,
		roles: undefined,
		isAdmin: false,
		sessionClaims: {},
		...overrides,
	};
}

function createAuth(identity: IdentityLike | null) {
	return {
		getUserIdentity: async () => identity,
	};
}

function createMutationCtx(db: MockDb, identity: IdentityLike | null) {
	return {
		db,
		auth: createAuth(identity),
		runMutation: async () => {
			throw new Error("Nested runMutation not implemented in tests");
		},
	};
}

function createEqBuilder() {
	const filters: Array<{ field: string; value: unknown }> = [];
	const builder = {
		eq(field: string, value: unknown) {
			filters.push({ field, value });
			return builder;
		},
	};

	return { builder, filters };
}

class MockDb {
	private tables: Record<TableName, Map<string, AnyDoc>> = {
		users: new Map(),
		listings: new Map(),
		savedListings: new Map(),
		subscriptions: new Map(),
		webhookEvents: new Map(),
		cartesiaSessions: new Map(),
	};

	private counter = 0;
	private time = 1_710_000_000_000;

	insert(table: TableName, value: Record<string, unknown>) {
		const _id = `${table}:${++this.counter}`;
		const doc: AnyDoc = {
			_id,
			_creationTime: this.time++,
			...value,
		};
		this.tables[table].set(_id, doc);
		return _id;
	}

	async get(id: string) {
		const table = this.getTableName(id);
		if (!table) {
			return null;
		}

		return this.tables[table].get(id) ?? null;
	}

	async patch(id: string, value: Record<string, unknown>) {
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
			...value,
		});
	}

	async delete(id: string) {
		const table = this.getTableName(id);
		if (!table) {
			throw new Error(`Unknown table for id ${id}`);
		}

		this.tables[table].delete(id);
	}

	query(table: TableName) {
		const getDocs = () => [...this.tables[table].values()];

		return {
			withIndex: (_indexName: string, build: (q: any) => unknown) => {
				const { builder, filters } = createEqBuilder();
				build(builder);

				const filtered = () =>
					getDocs().filter((doc) =>
						filters.every(
							({ field, value }) => (doc as Record<string, unknown>)[field] === value,
						),
					);

				return {
					collect: async () => filtered(),
					first: async () => filtered()[0] ?? null,
					unique: async () => {
						const results = filtered();
						assert.ok(
							results.length <= 1,
							`Expected unique result, received ${results.length}`,
						);
						return results[0] ?? null;
					},
				};
			},
			collect: async () => getDocs(),
		};
	}

	list(table: TableName) {
		return [...this.tables[table].values()];
	}

	private getTableName(id: string): TableName | null {
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
}

function withEnv<T>(
	patch: Record<string, string | undefined>,
	run: () => Promise<T>,
) {
	const previous = new Map<string, string | undefined>();
	for (const [key, value] of Object.entries(patch)) {
		previous.set(key, process.env[key]);
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}

	return run().finally(() => {
		for (const [key, value] of previous.entries()) {
			if (value === undefined) {
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
		headline: "Hidden listing",
	});
	const identity = createIdentity();

	const listMyListingsHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: Record<string, unknown>) => Promise<any>
	>(listMyListings);
	const getListingForEditHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: { id: string }) => Promise<any>
	>(getListingForEdit);

	const listResult = await listMyListingsHandler(
		{ db, auth: createAuth(identity) },
		{},
	);

	assert.deepEqual(listResult.listings, []);
	assert.equal(listResult.pagination.totalCount, 0);

	const editResult = await getListingForEditHandler(
		{ db, auth: createAuth(identity) },
		{ id: listingId },
	);

	assert.equal(editResult, null);
});

test("subscription reads fall back to authenticated identifiers before bootstrap", async () => {
	const db = new MockDb();
	const identity = createIdentity({
		tokenIdentifier: "token-subscription-user",
		subject: "clerk-user-42",
	});
	db.insert("subscriptions", {
		userId: identity.tokenIdentifier,
		status: "active",
		amount: 9900,
		currency: "usd",
		customerId: "cus_123",
		currentPeriodEnd: 1_710_000_123_000,
	});

	const statusHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: Record<string, never>) => Promise<any>
	>(checkUserSubscriptionStatus);
	const fetchHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: Record<string, never>) => Promise<any>
	>(fetchUserSubscription);

	const status = await statusHandler({ db, auth: createAuth(identity) }, {});
	assert.equal(status.hasActiveSubscription, true);

	const subscription = await fetchHandler(
		{ db, auth: createAuth(identity) },
		{},
	);
	assert.equal(subscription?.customerId, "cus_123");
	assert.equal(subscription?.userId, identity.tokenIdentifier);
});

test("saved listings work for canonical and legacy user identity matches", async (t) => {
	const saveListingHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: { listingId: string; notes?: string }) => Promise<any>
	>(saveListing);
	const isListingSavedHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: { listingId: string }) => Promise<boolean>
	>(isListingSaved);

	await t.test("canonical tokenIdentifier lookup", async () => {
		const db = new MockDb();
		const identity = createIdentity({
			tokenIdentifier: "token-canonical",
			subject: "user-canonical",
		});
		db.insert("users", {
			tokenIdentifier: identity.tokenIdentifier,
			subject: identity.subject,
			email: identity.email,
			name: identity.name,
			image: identity.pictureUrl,
		});

		await saveListingHandler(
			createMutationCtx(db, identity),
			{ listingId: "listings:canonical" },
		);

		const saved = await isListingSavedHandler(
			{ db, auth: createAuth(identity) },
			{ listingId: "listings:canonical" },
		);
		assert.equal(saved, true);
	});

	await t.test("legacy subject fallback upgrades tokenIdentifier", async () => {
		const db = new MockDb();
		const identity = createIdentity({
			tokenIdentifier: "token-upgraded",
			subject: "legacy-subject",
		});
		const userId = db.insert("users", {
			tokenIdentifier: "old-token",
			subject: identity.subject,
			email: "legacy@example.com",
			name: "Legacy User",
			image: undefined,
		});

		await saveListingHandler(
			createMutationCtx(db, identity),
			{ listingId: "listings:legacy" },
		);

		const upgradedUser = await db.get(userId);
		assert.equal(upgradedUser?.tokenIdentifier, identity.tokenIdentifier);

		const saved = await isListingSavedHandler(
			{ db, auth: createAuth(identity) },
			{ listingId: "listings:legacy" },
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
			ADMIN_USER_ID_ALLOWLIST: undefined,
			ADMIN_TOKEN_IDENTIFIER_ALLOWLIST: undefined,
		},
		async () => {
			const handlers = [
				["listListingsAdmin", getHandler(listListingsAdmin), {}],
				["getAllListingsDebug", getHandler(getAllListingsDebug), {}],
				["clearAllListings", getHandler(clearAllListings), {}],
				["seedListings", getHandler(seedListings), {}],
				["deleteSampleData", getHandler(deleteSampleData), {}],
				["deleteAllListings", getHandler(deleteAllListings), {}],
			] as const;

			for (const [name, handler, args] of handlers) {
				await t.test(name, async () => {
					await assert.rejects(
						() => handler({ auth }, args),
						/Admin access required/,
					);
				});
			}
		},
	);
});

test("webhook dedupe keeps subscription effects idempotent", async () => {
	const db = new MockDb();
	db.insert("users", {
		tokenIdentifier: "canonical-token",
		subject: "legacy-subject",
		email: "buyer@example.com",
		name: "Buyer",
		image: undefined,
	});

	const handler = getHandler<
		(ctx: { db: MockDb }, args: { polarEventId: string; body: Record<string, any> }) => Promise<any>
	>(handleWebhookEvent);

	const body = {
		type: "subscription.created",
		data: {
			id: "sub_123",
			price_id: "price_123",
			currency: "usd",
			recurring_interval: "month",
			metadata: {
				userId: "legacy-subject",
			},
			status: "active",
			created_at: "2026-04-01T00:00:00.000Z",
			modified_at: "2026-04-01T00:00:00.000Z",
			customer_id: "cus_123",
			amount: 9900,
		},
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
	const handler = getHandler<
		(ctx: { auth: ReturnType<typeof createAuth> }, args: Record<string, never>) => Promise<any>
	>(createCustomerPortalUrl);

	await assert.rejects(
		() => handler({ auth: createAuth(null) }, {}),
		/Not authenticated/,
	);
});

test("Cartesia session ownership and bridge token protections hold", async () => {
	const registerHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: { sessionId: string; anonymousOwnerToken?: string }) => Promise<any>
	>(registerSession);
	const pushHandler = getHandler<
		(ctx: { db: MockDb }, args: { sessionId: string; updateType: string; data: string; bridgeToken: string }) => Promise<void>
	>(pushUpdate);
	const latestHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: { sessionId: string; anonymousOwnerToken?: string }) => Promise<any>
	>(getLatestUpdate);
	const clearHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: { sessionId: string; anonymousOwnerToken?: string }) => Promise<void>
	>(clearSession);

	await withEnv(
		{
			CARTESIA_BRIDGE_SECRET: "bridge-secret",
		},
		async () => {
			const db = new MockDb();
			const owner = createIdentity({
				tokenIdentifier: "token-owner",
				subject: "owner",
			});
			const intruder = createIdentity({
				tokenIdentifier: "token-intruder",
				subject: "intruder",
				email: "intruder@example.com",
			});
			const sessionId = "session_12345678";

			await registerHandler({ db, auth: createAuth(owner) }, { sessionId });

			await assert.rejects(
				() =>
					registerHandler({ db, auth: createAuth(intruder) }, { sessionId }),
				/Session is already owned by another caller/,
			);

			await assert.rejects(
				() =>
					pushHandler({
						db,
					}, {
						sessionId,
						updateType: "selection",
						data: "{\"step\":1}",
						bridgeToken: "wrong-secret",
					}),
				/Invalid Cartesia bridge token/,
			);

			await pushHandler(
				{ db },
				{
					sessionId,
					updateType: "selection",
					data: "{\"step\":1}",
					bridgeToken: "bridge-secret",
				},
			);

			const ownerUpdate = await latestHandler(
				{ db, auth: createAuth(owner) },
				{ sessionId },
			);
			assert.equal(ownerUpdate?.version, 1);
			assert.equal(ownerUpdate?.updateType, "selection");

			const intruderUpdate = await latestHandler(
				{ db, auth: createAuth(intruder) },
				{ sessionId },
			);
			assert.equal(intruderUpdate, null);

			await assert.rejects(
				() => clearHandler({ db, auth: createAuth(intruder) }, { sessionId }),
				/Not authorized to clear this Cartesia session/,
			);

			await clearHandler({ db, auth: createAuth(owner) }, { sessionId });
			assert.equal(db.list("cartesiaSessions").length, 0);
		},
	);
});

test("Cartesia anonymous session capability protects public sessions", async () => {
	const registerHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: { sessionId: string; anonymousOwnerToken?: string }) => Promise<any>
	>(registerSession);
	const pushHandler = getHandler<
		(ctx: { db: MockDb }, args: { sessionId: string; updateType: string; data: string; bridgeToken: string }) => Promise<void>
	>(pushUpdate);
	const latestHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: { sessionId: string; anonymousOwnerToken?: string }) => Promise<any>
	>(getLatestUpdate);
	const clearHandler = getHandler<
		(ctx: { db: MockDb; auth: ReturnType<typeof createAuth> }, args: { sessionId: string; anonymousOwnerToken?: string }) => Promise<void>
	>(clearSession);

	await withEnv(
		{
			CARTESIA_BRIDGE_SECRET: "bridge-secret",
		},
		async () => {
			const db = new MockDb();
			const sessionId = "session_public_12345678";
			const ownerToken = "anon_owner_token_12345678";
			const intruderToken = "anon_intruder_token_87654321";

			await registerHandler(
				{ db, auth: createAuth(null) },
				{ sessionId, anonymousOwnerToken: ownerToken },
			);

			await assert.rejects(
				() =>
					registerHandler(
						{ db, auth: createAuth(null) },
						{ sessionId, anonymousOwnerToken: intruderToken },
					),
				/Session is already owned by another caller/,
			);

			await pushHandler(
				{ db },
				{
					sessionId,
					updateType: "selection",
					data: "{\"step\":1}",
					bridgeToken: "bridge-secret",
				},
			);

			const ownerUpdate = await latestHandler(
				{ db, auth: createAuth(null) },
				{ sessionId, anonymousOwnerToken: ownerToken },
			);
			assert.equal(ownerUpdate?.version, 1);
			assert.equal(ownerUpdate?.updateType, "selection");

			const intruderUpdate = await latestHandler(
				{ db, auth: createAuth(null) },
				{ sessionId, anonymousOwnerToken: intruderToken },
			);
			assert.equal(intruderUpdate, null);

			await assert.rejects(
				() =>
					clearHandler(
						{ db, auth: createAuth(null) },
						{ sessionId, anonymousOwnerToken: intruderToken },
					),
				/Not authorized to clear this Cartesia session/,
			);

			await clearHandler(
				{ db, auth: createAuth(null) },
				{ sessionId, anonymousOwnerToken: ownerToken },
			);
			assert.equal(db.list("cartesiaSessions").length, 0);
		},
	);
});
