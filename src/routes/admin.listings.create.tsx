import { ArrowLeft, Plus } from "lucide-react";
import {
	Link,
	createFileRoute,
	notFound,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { CreateListingForm } from "~/features/listings/components/forms";
import { loadAdminGuard } from "../lib/legacy-route-data";

export const Route = createFileRoute("/admin/listings/create")({
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
	component: AdminCreateListingPage,
});

function AdminCreateListingPage() {
	const navigate = useNavigate();
	const router = useRouter();

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
						<Plus className="h-8 w-8 text-blue-600" />
						Admin: Create Listing
					</h1>
					<p className="mt-4 text-lg text-gray-600">
						Administrative creation of new buyer or seller listing.
					</p>
				</div>

				<CreateListingForm
					onSuccess={() => navigate({ to: "/admin/listings" })}
					onCancel={() => router.history.back()}
				/>
			</div>
		</main>
	);
}
