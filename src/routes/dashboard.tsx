import type { CSSProperties } from "react";
import {
	Outlet,
	createFileRoute,
	notFound,
	redirect,
} from "@tanstack/react-router";
import { AppSidebar } from "~/components/dashboard/app-sidebar";
import { SiteHeader } from "~/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { loadDashboardShell } from "../lib/legacy-route-data";

export const Route = createFileRoute("/dashboard")({
	loader: async () => {
		const result = await loadDashboardShell();
		if (result.status === "redirect") {
			throw redirect({ to: result.to });
		}

		if (result.status === "not-found") {
			throw notFound();
		}

		return result.data;
	},
	component: DashboardLayout,
});

function DashboardLayout() {
	const { user } = Route.useLoaderData();

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
