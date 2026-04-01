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
import type React from "react";
import { Link } from "react-router";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { requireAdminRoute } from "../../utils/auth.server";
import type { Route } from "./+types/index";

export async function loader(args: Route.LoaderArgs) {
	await requireAdminRoute(args);
	return { isAdmin: true };
}

const AdminDashboard: React.FC = () => {
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
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-4">
						<Shield className="w-8 h-8 text-red-600" />
						<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
							Admin Dashboard
						</h1>
					</div>
					<p className="text-lg text-gray-600">
						Administrative interface for managing the REOP platform.
					</p>
				</div>

				{/* Quick Actions */}
				<div className="mb-12">
					<h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{quickActions.map((action) => (
							<Card
								key={action.title}
								className="hover:shadow-md transition-shadow"
							>
								<CardContent className="p-6">
									<div className="flex items-center gap-3 mb-3">
										<div
											className={`p-2 rounded-lg ${action.color} text-white`}
										>
											<action.icon className="w-5 h-5" />
										</div>
										<h3 className="font-semibold">{action.title}</h3>
									</div>
									<p className="text-sm text-muted-foreground mb-4">
										{action.description}
									</p>
									<Button asChild size="sm" className="w-full">
										<Link to={action.href}>
											Go to {action.title}
											<ArrowRight className="w-3 h-3 ml-1" />
										</Link>
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* Admin Features */}
				<div>
					<h2 className="text-xl font-semibold mb-6">
						Administrative Features
					</h2>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{adminFeatures.map((feature) => (
							<Card
								key={feature.title}
								className="hover:shadow-md transition-shadow"
							>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<feature.icon className="w-6 h-6 text-blue-600" />
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
									<p className="text-muted-foreground mb-4">
										{feature.description}
									</p>
									<ul className="space-y-1 mb-6">
										{feature.features.map((item, index) => (
											<li
												key={index}
												className="text-sm text-muted-foreground flex items-center gap-2"
											>
												<div className="w-1 h-1 bg-blue-600 rounded-full" />
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
												<ArrowRight className="w-4 h-4 ml-2" />
											)}
										</Link>
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* Security Notice */}
				<div className="mt-12 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-center gap-2 text-red-800">
						<Shield className="w-5 h-5" />
						<h3 className="font-semibold">Security Notice</h3>
					</div>
					<p className="text-sm text-red-700 mt-2">
						This is an administrative interface with elevated privileges. Please
						ensure you have proper authorization before accessing or modifying
						any data.
					</p>
				</div>
			</div>
		</main>
	);
};

export default AdminDashboard;
