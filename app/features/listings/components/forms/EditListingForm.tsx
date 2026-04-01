import type { Id } from "@/convex/_generated/dataModel";
import { AlertCircle } from "lucide-react";
import type React from "react";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { Skeleton } from "../../../../components/ui/skeleton";
import { useListingForEdit } from "../../data/listingsService";
import { BuyerListingForm } from "./BuyerListingForm";
import { SellerListingForm } from "./SellerListingForm";

interface EditListingFormProps {
	listingId: Id<"listings">;
	onSuccess?: (listingId: string) => void;
	onCancel?: () => void;
}

export const EditListingForm: React.FC<EditListingFormProps> = ({
	listingId,
	onSuccess,
	onCancel,
}) => {
	const listing = useListingForEdit(listingId);

	// Loading state
	if (listing === undefined) {
		return (
			<div className="space-y-8">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="space-y-4">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				))}
			</div>
		);
	}

	// Error state - listing not found
	if (listing === null) {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					Listing not found or you don't have permission to edit it.
				</AlertDescription>
			</Alert>
		);
	}

	// Route to appropriate form based on listing type
	if (listing.listingType === "buyer") {
		return (
			<BuyerListingForm
				listingId={listingId}
				onSuccess={onSuccess}
				onCancel={onCancel}
			/>
		);
	}

	if (listing.listingType === "seller") {
		return (
			<SellerListingForm
				listingId={listingId}
				onSuccess={onSuccess}
				onCancel={onCancel}
			/>
		);
	}

	// Fallback for unknown listing type
	return (
		<Alert variant="destructive">
			<AlertCircle className="h-4 w-4" />
			<AlertDescription>
				Unknown listing type. Unable to display form.
			</AlertDescription>
		</Alert>
	);
};
