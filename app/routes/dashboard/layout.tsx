import type { CSSProperties } from "react";
import { createClerkClient } from "@clerk/react-router/api.server";
import { redirect, useLoaderData } from "react-router";
import { Outlet } from "react-router";
import { AppSidebar } from "~/components/dashboard/app-sidebar";
import { SiteHeader } from "~/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { createAuthedConvexServerClient } from "~/utils/auth.server";
import { api } from "../../../convex/_generated/api";
import type { Route } from "./+types/layout";

export async function loader(args: Route.LoaderArgs) {
	const { auth, client } = await createAuthedConvexServerClient(args);
	const userId = auth.userId;

	// Parallel data fetching to reduce waterfall
	const [subscriptionStatus, user] = await Promise.all([
		client.query(api.subscriptions.checkUserSubscriptionStatus, {}),
		createClerkClient({
			secretKey: process.env.CLERK_SECRET_KEY,
		}).users.getUser(userId),
	]);

	// Redirect to subscription-required if no active subscription
	if (!subscriptionStatus?.hasActiveSubscription) {
		throw redirect("/subscription-required");
	}

	return { user };
}

export default function DashboardLayout() {
	const { user } = useLoaderData();

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as CSSProperties
			}
		>
			<AppSidebar variant="inset" user={user} />
			<SidebarInset>
				<SiteHeader />
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}
