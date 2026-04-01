import { defineSchema } from "convex/server";
import { cartesiaSessions } from "./cartesiaSessions";
import { listings } from "./listings";
import { savedListingsTable } from "./savedListings";
import { searches } from "./searches";
import { subscriptions } from "./subscriptions";
import { userPreferences } from "./userPreferences";
import { users } from "./users";
import { webhookEvents } from "./webhooks";
export default defineSchema({
    users,
    listings,
    subscriptions,
    webhookEvents,
    searches,
    userPreferences,
    savedListings: savedListingsTable,
    cartesiaSessions,
});
