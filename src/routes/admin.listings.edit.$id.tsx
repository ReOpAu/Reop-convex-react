import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Edit } from "lucide-react";
import {
	Link,
	createFileRoute,
	notFound,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { EditListingForm } from "~/features/listings/components/forms";
import { loadAdminGuard } from "../lib/legacy-route-data";

export const Route = createFileRoute("/admin/listings/edit/$id")({
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
	component: AdminEditListingPage,
});

function AdminEditListingPage() {
	const navigate = useNavigate();
	const router = useRouter();
	const { id } = Route.useParams();

	if (!id) {
		return (
			<main className="flex-1 bg-gradient-to-b from-gray-50 to-white">
				<div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900">
							Listing not found
						</h1>
						<p className="mt-2 text-gray-600">No listing ID provided.</p>
						<Button asChild className="mt-4">
							<Link to="/admin/listings">Back to Admin</Link>
						</Button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="mb-8 flex items-center gap-4">
					<Button variant="ghost" asChild>
						<Link to="/admin/listings">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Admin Listings
						</Link>
					</Button>
				</div>

				<div className="mb-8">
					<h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						<Edit className="h-8 w-8 text-blue-600" />
						Admin: Edit Listing
					</h1>
					<p className="mt-4 text-lg text-gray-600">
						Administrative editing of listing details.
					</p>
				</div>

				<EditListingForm
					listingId={id as Id<"listings">}
					onSuccess={() => navigate({ to: "/admin/listings" })}
					onCancel={() => router.history.back()}
				/>
			</div>
		</main>
	);
}
