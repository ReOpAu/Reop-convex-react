import { IconDashboard, IconSettings } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
} from "~/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";

const data = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: IconDashboard,
		},
		{
			title: "Chat",
			url: "/dashboard/chat",
			icon: MessageCircle,
		},
	],
	navSecondary: [
		{
			title: "Settings",
			url: "/dashboard/settings",
			icon: IconSettings,
		},
	],
};

export function AppSidebar({
	variant,
	user,
}: {
	variant: "sidebar" | "floating" | "inset";
	user: any;
}) {
	return (
		<Sidebar collapsible="offcanvas" variant={variant}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<Link to="/" preload="viewport">
							<span className="text-base font-semibold">Ras Mic Inc.</span>
						</Link>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
		</Sidebar>
	);
}
