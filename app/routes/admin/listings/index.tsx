import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Database, Plus, Settings } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../../../components/ui/tabs";
import { AdminListingsTable } from "../../../features/listings/components/admin";
import {
	CreateListingForm,
	EditListingForm,
} from "../../../features/listings/components/forms";
import { requireAdminRoute } from "../../../utils/auth.server";
import type { Route } from "./+types/index";

export async function loader(args: Route.LoaderArgs) {
	await requireAdminRoute(args);
	return { isAdmin: true };
}

const AdminListingsPage: React.FC = () => {
	const navigate = useNavigate();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingListingId, setEditingListingId] =
		useState<Id<"listings"> | null>(null);

	const handleCreateSuccess = (listingId: string) => {
		setCreateDialogOpen(false);
		// Could navigate to the listing or just refresh the table
	};

	const handleEditSuccess = (listingId: string) => {
		setEditDialogOpen(false);
		setEditingListingId(null);
	};

	const handleCreateListing = () => {
		setCreateDialogOpen(true);
	};

	const handleEditListing = (listingId: Id<"listings">) => {
		setEditingListingId(listingId);
		setEditDialogOpen(true);
	};

	return (
		<main className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				{/* Header */}
				<div className="flex items-center gap-4 mb-8">
					<Button variant="ghost" onClick={() => navigate("/admin")}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Admin
					</Button>
				</div>

				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl flex items-center gap-3">
						<Database className="w-8 h-8 text-blue-600" />
						Listings Administration
					</h1>
					<p className="mt-4 text-lg text-gray-600">
						Manage all buyer and seller listings across the platform.
					</p>
				</div>

				{/* Admin Tabs */}
				<Tabs defaultValue="table" className="space-y-6">
					<TabsList className="grid w-full max-w-md grid-cols-2">
						<TabsTrigger value="table" className="flex items-center gap-2">
							<Database className="w-4 h-4" />
							Listings Table
						</TabsTrigger>
						<TabsTrigger value="settings" className="flex items-center gap-2">
							<Settings className="w-4 h-4" />
							Settings
						</TabsTrigger>
					</TabsList>

					<TabsContent value="table">
						<AdminListingsTable onCreateListing={handleCreateListing} />
					</TabsContent>

					<TabsContent value="settings">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

				{/* Create Listing Dialog */}
				<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
					<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Plus className="w-5 h-5" />
								Create New Listing
							</DialogTitle>
						</DialogHeader>
						<CreateListingForm
							onSuccess={handleCreateSuccess}
							onCancel={() => setCreateDialogOpen(false)}
						/>
					</DialogContent>
				</Dialog>

				{/* Edit Listing Dialog */}
				<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
					<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Settings className="w-5 h-5" />
								Edit Listing
							</DialogTitle>
						</DialogHeader>
						{editingListingId && (
							<EditListingForm
								listingId={editingListingId}
								onSuccess={handleEditSuccess}
								onCancel={() => setEditDialogOpen(false)}
							/>
						)}
					</DialogContent>
				</Dialog>
			</div>
		</main>
	);
};

export default AdminListingsPage;
