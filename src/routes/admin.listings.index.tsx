import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Database, Plus, Settings } from "lucide-react";
import { useState } from "react";
import {
	createFileRoute,
	notFound,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "~/components/ui/tabs";
import { AdminListingsTable } from "~/features/listings/components/admin";
import {
	CreateListingForm,
	EditListingForm,
} from "~/features/listings/components/forms";
import { loadAdminGuard } from "../lib/legacy-route-data";

export const Route = createFileRoute("/admin/listings/")({
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
	component: AdminListingsPage,
});

function AdminListingsPage() {
	const navigate = useNavigate();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingListingId, setEditingListingId] =
		useState<Id<"listings"> | null>(null);

	return (
		<main className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="mb-8 flex items-center gap-4">
					<Button variant="ghost" onClick={() => navigate({ to: "/admin" })}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Admin
					</Button>
				</div>

				<div className="mb-8">
					<h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						<Database className="h-8 w-8 text-blue-600" />
						Listings Administration
					</h1>
					<p className="mt-4 text-lg text-gray-600">
						Manage all buyer and seller listings across the platform.
					</p>
				</div>

				<Tabs defaultValue="table" className="space-y-6">
					<TabsList className="grid w-full max-w-md grid-cols-2">
						<TabsTrigger value="table" className="flex items-center gap-2">
							<Database className="h-4 w-4" />
							Listings Table
						</TabsTrigger>
						<TabsTrigger value="settings" className="flex items-center gap-2">
							<Settings className="h-4 w-4" />
							Settings
						</TabsTrigger>
					</TabsList>

					<TabsContent value="table">
						<AdminListingsTable
							onCreateListing={() => setCreateDialogOpen(true)}
						/>
					</TabsContent>

					<TabsContent value="settings">
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle>Bulk Operations</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<Button variant="outline" className="w-full justify-start">
										Export All Listings (CSV)
									</Button>
									<Button variant="outline" className="w-full justify-start">
										Import Listings (CSV)
									</Button>
									<Button
										variant="destructive"
										className="w-full justify-start"
									>
										Clear All Sample Data
									</Button>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>System Stats</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="text-sm">
										<div className="flex justify-between">
											<span>Total Listings:</span>
											<span className="font-medium">—</span>
										</div>
										<div className="flex justify-between">
											<span>Active Users:</span>
											<span className="font-medium">—</span>
										</div>
										<div className="flex justify-between">
											<span>Database Size:</span>
											<span className="font-medium">—</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				</Tabs>

				<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
					<DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Plus className="h-5 w-5" />
								Create New Listing
							</DialogTitle>
						</DialogHeader>
						<CreateListingForm
							onSuccess={() => setCreateDialogOpen(false)}
							onCancel={() => setCreateDialogOpen(false)}
						/>
					</DialogContent>
				</Dialog>

				<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
					<DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Settings className="h-5 w-5" />
								Edit Listing
							</DialogTitle>
						</DialogHeader>
						{editingListingId && (
							<EditListingForm
								listingId={editingListingId}
								onSuccess={() => {
									setEditDialogOpen(false);
									setEditingListingId(null);
								}}
								onCancel={() => setEditDialogOpen(false)}
							/>
						)}
					</DialogContent>
				</Dialog>
			</div>
		</main>
	);
}
