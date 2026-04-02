import {
	ArrowRight,
	BarChart3,
	Database,
	FileText,
	HelpCircle,
	Home,
	Settings,
	Shield,
	Users,
} from "lucide-react";
import { Link, createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { loadAdminGuard } from "../lib/legacy-route-data";

export const Route = createFileRoute("/admin/")({
	loader: async () => {
		const result = await loadAdminGuard();
		if (result.status === "redirect") {
			throw redirect({ to: result.to });
		}

		if (result.status === "not-found") {
			throw notFound();
		}

		return { isAdmin: true };
	},
	component: AdminDashboard,
});

function AdminDashboard() {
	const adminFeatures = [
		{
			title: "Listings Management",
			description:
				"View, create, edit, and delete all buyer and seller listings",
			icon: Database,
			href: "/admin/listings",
			badge: "Primary",
			features: [
				"Full CRUD operations",
				"Advanced filtering",
				"Bulk operations",
			],
		},
		{
			title: "User Management",
			description: "Manage user accounts, permissions, and subscriptions",
			icon: Users,
			href: "/admin/users",
			badge: "Coming Soon",
			features: ["User profiles", "Role management", "Activity logs"],
		},
		{
			title: "Analytics & Reports",
			description:
				"View platform analytics, usage statistics, and generate reports",
			icon: BarChart3,
			href: "/admin/analytics",
			badge: "Coming Soon",
			features: ["Usage metrics", "Revenue tracking", "Performance reports"],
		},
		{
			title: "System Settings",
			description: "Configure platform settings, integrations, and preferences",
			icon: Settings,
			href: "/admin/settings",
			badge: "Coming Soon",
			features: ["API configurations", "Feature flags", "System maintenance"],
		},
	];

	const quickActions = [
		{
			title: "Create New Listing",
			description: "Add a new buyer or seller listing",
			icon: Home,
			href: "/admin/listings/create",
			color: "bg-blue-500",
		},
		{
			title: "View All Listings",
			description: "Browse and manage existing listings",
			icon: Database,
			href: "/admin/listings",
			color: "bg-green-500",
		},
		{
			title: "System Logs",
			description: "View application logs and errors",
			icon: FileText,
			href: "/admin/logs",
			color: "bg-yellow-500",
		},
		{
			title: "Support Tickets",
			description: "Manage user support requests",
			icon: HelpCircle,
			href: "/admin/support",
			color: "bg-purple-500",
		},
	];

	return (
		<main className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="mb-8">
					<div className="mb-4 flex items-center gap-3">
						<Shield className="h-8 w-8 text-red-600" />
						<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
							Admin Dashboard
						</h1>
					</div>
					<p className="text-lg text-gray-600">
						Administrative interface for managing the REOP platform.
					</p>
				</div>

				<div className="mb-12">
					<h2 className="mb-6 text-xl font-semibold">Quick Actions</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
						{quickActions.map((action) => (
							<Card
								key={action.title}
								className="transition-shadow hover:shadow-md"
							>
								<CardContent className="p-6">
									<div className="mb-3 flex items-center gap-3">
										<div
											className={`rounded-lg p-2 text-white ${action.color}`}
										>
											<action.icon className="h-5 w-5" />
										</div>
										<h3 className="font-semibold">{action.title}</h3>
									</div>
									<p className="mb-4 text-sm text-muted-foreground">
										{action.description}
									</p>
									<Button asChild size="sm" className="w-full">
										<Link to={action.href}>
											Go to {action.title}
											<ArrowRight className="ml-1 h-3 w-3" />
										</Link>
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				<div>
					<h2 className="mb-6 text-xl font-semibold">
						Administrative Features
					</h2>
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{adminFeatures.map((feature) => (
							<Card
								key={feature.title}
								className="transition-shadow hover:shadow-md"
							>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<feature.icon className="h-6 w-6 text-blue-600" />
											<CardTitle className="text-lg">{feature.title}</CardTitle>
										</div>
										<Badge
											variant={
												feature.badge === "Primary" ? "default" : "secondary"
											}
										>
											{feature.badge}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<p className="mb-4 text-muted-foreground">
										{feature.description}
									</p>
									<ul className="mb-6 space-y-1">
										{feature.features.map((item) => (
											<li
												key={item}
												className="flex items-center gap-2 text-sm text-muted-foreground"
											>
												<div className="h-1 w-1 rounded-full bg-blue-600" />
												{item}
											</li>
										))}
									</ul>
									<Button
										asChild
										className="w-full"
										disabled={feature.badge === "Coming Soon"}
									>
										<Link to={feature.href}>
											{feature.badge === "Coming Soon"
												? "Coming Soon"
												: "Access Feature"}
											{feature.badge !== "Coming Soon" && (
												<ArrowRight className="ml-2 h-4 w-4" />
											)}
										</Link>
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				<div className="mt-12 rounded-lg border border-red-200 bg-red-50 p-4">
					<div className="flex items-center gap-2 text-red-800">
						<Shield className="h-5 w-5" />
						<h3 className="font-semibold">Security Notice</h3>
					</div>
					<p className="mt-2 text-sm text-red-700">
						This is an administrative interface with elevated privileges. Please
						use caution when making changes.
					</p>
				</div>
			</div>
		</main>
	);
}
