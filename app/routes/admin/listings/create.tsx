import { ArrowLeft, Plus } from "lucide-react";
import type React from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../../components/ui/button";
import { CreateListingForm } from "../../../features/listings/components/forms";
import { requireAdminRoute } from "../../../utils/auth.server";
import type { Route } from "./+types/create";

export async function loader(args: Route.LoaderArgs) {
	await requireAdminRoute(args);
	return { isAdmin: true };
}

const AdminCreateListingPage: React.FC = () => {
	const navigate = useNavigate();

	const handleSuccess = (listingId: string) => {
		// Navigate back to admin listings
		navigate("/admin/listings");
	};

	const handleCancel = () => {
		navigate(-1); // Go back to previous page
	};

	return (
		<main className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				{/* Header */}
				<div className="flex items-center gap-4 mb-8">
					<Button variant="ghost" asChild>
						<Link to="/admin/listings">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to Admin Listings
						</Link>
					</Button>
				</div>

				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl flex items-center gap-3">
						<Plus className="w-8 h-8 text-blue-600" />
						Admin: Create Listing
					</h1>
					<p className="mt-4 text-lg text-gray-600">
						Administrative creation of new buyer or seller listing.
					</p>
				</div>

				{/* Form */}
				<CreateListingForm onSuccess={handleSuccess} onCancel={handleCancel} />
			</div>
		</main>
	);
};

export default AdminCreateListingPage;
