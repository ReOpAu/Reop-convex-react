import { ArrowLeft, Plus } from "lucide-react";
import type React from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Button } from "../../../components/ui/button";
import { CreateListingForm } from "../components/forms";

const CreateListingPage: React.FC = () => {
	const navigate = useNavigate();
	const router = useRouter();

	const handleSuccess = (_listingId: string) => {
		// Navigate to the created listing or listings overview
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
						<Plus className="w-8 h-8 text-blue-600" />
						Create New Listing
					</h1>
					<p className="mt-4 text-lg text-gray-600">
						Create a buyer or seller listing to connect with property matches in
						your area.
					</p>
				</div>

				{/* Form */}
				<CreateListingForm onSuccess={handleSuccess} onCancel={handleCancel} />
			</div>
		</div>
	);
};

export default CreateListingPage;
