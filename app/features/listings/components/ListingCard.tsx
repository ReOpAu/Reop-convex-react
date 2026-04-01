import type React from "react";
import { Link } from "react-router";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import type { ConvexListing } from "../types";
import { generateListingUrl } from "../utils/urlHelpers";
import { Map } from "./Map";
import { PropertyIcons } from "./PropertyIcons";
import { SaveButton } from "./SaveButton";
import { StatusRibbon } from "./StatusRibbon";

export interface ListingCardProps {
	listing: ConvexListing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
	const hasExactLocation =
		listing.hasExactLocation !== false &&
		typeof listing.latitude === "number" &&
		typeof listing.longitude === "number";

	// Helper functions
	const formatPrice = () => {
		if (!listing.priceMin || !listing.priceMax) return "Price not specified";

		const formatCurrency = (num: number) => {
			if (num >= 1000000) {
				return `$${(num / 1000000).toFixed(1)}M`;
			} else if (num >= 100000) {
				return `$${(num / 1000).toFixed(0)}K`;
			} else {
				return `$${num.toLocaleString()}`;
			}
		};

		return `${formatCurrency(listing.priceMin)} - ${formatCurrency(listing.priceMax)}`;
	};

	const isNewListing = () => {
		if (!listing.createdAt || listing.sample) return false;
		const createdDate = new Date(listing.createdAt);
		const twoWeeksAgo = new Date();
		twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
		return createdDate > twoWeeksAgo;
	};

	const formatDate = () => {
		if (!listing.createdAt) return "Date not available";
		return new Date(listing.createdAt).toLocaleDateString();
	};

	return (
		<Card
			className={`relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden ${
				listing.listingType === "buyer"
					? "hover:shadow-blue-500/10"
					: "hover:shadow-purple-500/10"
			}`}
		>
			{/* Status Ribbon */}
			{listing.sample ? (
				<StatusRibbon variant="SAMPLE" />
			) : (
				isNewListing() && <StatusRibbon variant="NEW" />
			)}

			<Link to={generateListingUrl(listing)} className="block">
				{/* Map preview */}
				<div className="h-64 relative -m-6 mb-6">
					{hasExactLocation ? (
						<Map
							location={{
								latitude: listing.latitude!,
								longitude: listing.longitude!,
							}}
							zoom={15}
							interactive={false}
							listings={[listing]}
							className="w-full h-full rounded-t-2xl"
						/>
					) : (
						<div className="flex h-full items-end rounded-t-2xl bg-gradient-to-br from-slate-100 via-white to-slate-200 p-6">
							<div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
								Approximate suburb shown only
							</div>
						</div>
					)}
				</div>

				<CardContent className="p-6 space-y-4">
					{/* Badges */}
					<div className="flex flex-wrap gap-2 items-center">
						<Badge
							variant={
								listing.listingType === "buyer" ? "default" : "secondary"
							}
						>
							{listing.listingType}
						</Badge>
						{listing.listingType === "buyer" && listing.buyerType && (
							<Badge variant="outline">{listing.buyerType}</Badge>
						)}
						{listing.listingType === "seller" && listing.sellerType && (
							<Badge variant="outline">{listing.sellerType}</Badge>
						)}
						{listing.listingType === "buyer" &&
							listing.buyerType === "street" &&
							listing.searchRadius && (
								<Badge
									variant="outline"
									className="bg-blue-50 text-blue-700 border-blue-200"
								>
									{listing.searchRadius}km radius
								</Badge>
							)}
					</div>

					{/* Title */}
					<h3 className="font-bold text-xl tracking-tight text-gray-900 line-clamp-2">
						{listing.headline}
					</h3>

					{/* Location */}
					<p className="font-medium text-gray-900">
						{listing.suburb}, {listing.state} {listing.postcode}
					</p>

					{/* Price */}
					<p className="text-xl font-bold tracking-tight text-gray-900">
						{formatPrice()}
					</p>

					{/* Property Icons */}
					<PropertyIcons
						buildingType={listing.buildingType || "House"}
						bedrooms={listing.bedrooms}
						bathrooms={listing.bathrooms}
						parkingSpaces={listing.parking}
					/>

					{/* Features */}
					{listing.features && listing.features.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{listing.features.slice(0, 3).map((feature, index) => (
								<span
									key={index}
									className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
								>
									{feature}
								</span>
							))}
							{listing.features.length > 3 && (
								<span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
									+{listing.features.length - 3} more
								</span>
							)}
						</div>
					)}

					{/* Footer info */}
					<div className="pt-4 border-t border-gray-100">
						<p className="text-xs text-gray-500">Listed: {formatDate()}</p>
					</div>
				</CardContent>
			</Link>

			{/* Save button */}
			{listing._id && (
				<div className="absolute top-2 right-2 z-20">
					<SaveButton listingId={listing._id as Id<"listings">} />
				</div>
			)}
		</Card>
	);
};
