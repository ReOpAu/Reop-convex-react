import { useConvexAuth } from "convex/react";
import { Eye, Mail, Phone, User } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Link } from "react-router";
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
	const [showContactInfo, setShowContactInfo] = useState(false);
	const { isAuthenticated } = useConvexAuth();
	const hasExactLocation =
		listing.hasExactLocation !== false &&
		typeof listing.latitude === "number" &&
		typeof listing.longitude === "number";

	const handleContactClick = () => {
		if (isAuthenticated) {
			setShowContactInfo(true);
		} else {
			// Redirect to sign in or show sign in modal
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
					Contact Owner
				</Button>

				{/* Contact Information (shown after clicking Contact) */}
				{showContactInfo && (
					<div className="space-y-2 p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-2">
							<Phone className="w-4 h-4 text-gray-500" />
							<span className="text-sm">
								{/* TODO: Get actual contact info from user profile */}
								(555) 123-4567
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Mail className="w-4 h-4 text-gray-500" />
							<span className="text-sm">
								{/* TODO: Get actual contact info from user profile */}
								owner@example.com
							</span>
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
