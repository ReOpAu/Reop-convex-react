import { useConvexAuth } from "convex/react";
import { Eye, Info, User } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import type { Listing } from "../types";
import { generateMatchesUrl } from "../utils/urlHelpers";
import { NearbyPlacesButton } from "./NearbyPlacesButton";
import { SaveButton } from "./SaveButton";
import { StreetViewButton } from "./StreetViewButton";

export interface ListingActionsProps {
	listing: Listing;
}

export const ListingActions: React.FC<ListingActionsProps> = ({ listing }) => {
	const [showContactNotice, setShowContactNotice] = useState(false);
	const { isAuthenticated } = useConvexAuth();
	const hasExactLocation =
		listing.hasExactLocation !== false &&
		typeof listing.latitude === "number" &&
		typeof listing.longitude === "number";

	const handleContactClick = () => {
		if (isAuthenticated) {
			setShowContactNotice(true);
		} else {
			window.location.href = "/sign-in";
		}
	};

	return (
		<Card className="sticky top-4">
			<CardHeader>
				<CardTitle className="text-lg">Actions</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Save Button */}
				{listing._id && (
					<div className="flex justify-center">
						<SaveButton listingId={listing._id as Id<"listings">} />
					</div>
				)}

				<Separator />

				{/* Contact Button */}
				<Button
					className="w-full"
					variant="default"
					onClick={handleContactClick}
				>
					<User className="w-4 h-4 mr-2" />
					{isAuthenticated ? "Contact Owner" : "Sign In to Contact Owner"}
				</Button>

				{showContactNotice && (
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
						<div className="flex items-start gap-2">
							<Info className="mt-0.5 h-4 w-4 shrink-0" />
							<p>
								Direct owner contact is not available in this release yet. Save
								the listing now and check back once verified messaging is live.
							</p>
						</div>
					</div>
				)}

				<Separator />

				{hasExactLocation && (
					<>
						<StreetViewButton
							lat={listing.latitude!}
							lng={listing.longitude!}
							variant="outline"
							size="default"
							className="w-full"
						/>

						<Separator />

						<NearbyPlacesButton
							latitude={listing.latitude!}
							longitude={listing.longitude!}
							radius={5000}
							variant="outline"
							size="default"
							className="w-full"
						/>

						<Separator />
					</>
				)}

				{/* View Matches Button */}
				{listing._id && (
					<Button className="w-full" variant="outline" asChild>
						<Link to={generateMatchesUrl(listing)}>
							<Eye className="w-4 h-4 mr-2" />
							View Matches
						</Link>
					</Button>
				)}

				{/* Additional Info */}
				<div className="text-xs text-gray-500 space-y-1">
					<p>Listed: {new Date(listing.createdAt).toLocaleDateString()}</p>
					{listing.isPremium && (
						<p className="text-orange-600 font-medium">Premium Listing</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
