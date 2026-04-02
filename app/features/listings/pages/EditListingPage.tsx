import type { Id } from "@/convex/_generated/dataModel";
import { Link, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Edit } from "lucide-react";
import type React from "react";
import { Button } from "../../../components/ui/button";
import { EditListingForm } from "../components/forms";

const EditListingPage: React.FC = () => {
	const navigate = useNavigate();
	const router = useRouter();
	const { id } = useParams({ strict: false }) as { id?: string };

	if (!id) {
		return (
			<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
				<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900">
							Listing not found
						</h1>
						<p className="mt-2 text-gray-600">No listing ID provided.</p>
						<Button asChild className="mt-4">
							<Link to="/listings">Back to Listings</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	const handleSuccess = (_listingId: string) => {
		// Navigate to the updated listing or listings overview
		navigate({ to: "/listings/my-listings" });
	};

	const handleCancel = () => {
		router.history.back();
	};

	return (
		<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				{/* Header */}
				<div className="flex items-center gap-4 mb-8">
					<Button variant="ghost" asChild>
						<Link to="/listings/my-listings">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to My Listings
						</Link>
					</Button>
				</div>

				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl flex items-center gap-3">
						<Edit className="w-8 h-8 text-blue-600" />
						Edit Listing
					</h1>
					<p className="mt-4 text-lg text-gray-600">
						Update your listing details to improve your property matches.
					</p>
				</div>

				{/* Form */}
				<EditListingForm
					listingId={id as Id<"listings">}
					onSuccess={handleSuccess}
					onCancel={handleCancel}
				/>
			</div>
		</div>
	);
};

export default EditListingPage;
