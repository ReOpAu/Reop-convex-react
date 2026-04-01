import { Bath, Bed, Car, Home, MapPin } from "lucide-react";
import type React from "react";
import { Badge } from "../../../components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import type { Listing } from "../types";
import { calculateListingDistance, formatDistance } from "../utils/distance";
import { Map } from "./Map";

interface ComparisonMapProps {
	originalListing: Listing;
	matchedListing: Listing;
	distance?: number;
}

export const ComparisonMap: React.FC<ComparisonMapProps> = ({
	originalListing,
	matchedListing,
	distance,
}) => {
	const originalHasExactLocation =
		originalListing.hasExactLocation !== false &&
		typeof originalListing.latitude === "number" &&
		typeof originalListing.longitude === "number";
	const matchedHasExactLocation =
		matchedListing.hasExactLocation !== false &&
		typeof matchedListing.latitude === "number" &&
		typeof matchedListing.longitude === "number";

	// Helper function to format price
	const formatPrice = (listing: Listing): string => {
		if (!listing.priceMin && !listing.priceMax) return "Price not specified";
		return `$${listing.priceMin.toLocaleString()} - $${listing.priceMax.toLocaleString()}`;
	};

	// Determine if suburbs match
	const suburbsMatch =
		originalListing.suburb.toLowerCase() ===
		matchedListing.suburb.toLowerCase();

	// Calculate accurate distance between listings
	const calculatedDistance =
		distance ?? calculateListingDistance(originalListing, matchedListing);
	const distanceDisplay = calculatedDistance
		? formatDistance(calculatedDistance)
		: "Distance unknown";

	return (
		<div className="space-y-6">
			{/* Side-by-side maps */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Original Listing Map */}
				<Card>
					<CardHeader
						className={`${originalListing.listingType === "buyer" ? "bg-blue-50" : "bg-purple-50"}`}
					>
						<div className="flex justify-between items-start">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Home className="w-5 h-5" />
									Original Listing
									<Badge
										variant={
											originalListing.listingType === "buyer"
												? "default"
												: "secondary"
										}
									>
										{originalListing.listingType}
									</Badge>
								</CardTitle>
								<div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
									<MapPin className="w-4 h-4" />
									{originalListing.address && `${originalListing.address}, `}
									{originalListing.suburb}, {originalListing.state}
								</div>
							</div>
							<div className="text-right">
								<div className="font-bold text-lg">
									{formatPrice(originalListing)}
								</div>
								<div className="text-xs text-gray-600">
									{originalListing.buildingType}
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{/* Map */}
						<div className="h-48 relative">
							{originalHasExactLocation ? (
								<Map
									location={{
										latitude: originalListing.latitude!,
										longitude: originalListing.longitude!,
									}}
									zoom={15}
									interactive={false}
									listings={[originalListing]}
									className="w-full h-full rounded-none"
								/>
							) : (
								<div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-600">
									Exact location hidden for this listing
								</div>
							)}
						</div>

						{/* Property details */}
						<div className="p-4 space-y-3">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div className="flex items-center gap-2">
									<Bed className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Bedrooms:</span>
									<span className="font-medium">
										{originalListing.bedrooms}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Bath className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Bathrooms:</span>
									<span className="font-medium">
										{originalListing.bathrooms}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Car className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Parking:</span>
									<span className="font-medium">{originalListing.parking}</span>
								</div>
								<div className="flex items-center gap-2">
									<Home className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Type:</span>
									<span className="font-medium">
										{originalListing.buildingType}
									</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Matched Listing Map */}
				<Card>
					<CardHeader
						className={`${matchedListing.listingType === "buyer" ? "bg-blue-50" : "bg-purple-50"}`}
					>
						<div className="flex justify-between items-start">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Home className="w-5 h-5" />
									Matched Listing
									<Badge
										variant={
											matchedListing.listingType === "buyer"
												? "default"
												: "secondary"
										}
									>
										{matchedListing.listingType}
									</Badge>
								</CardTitle>
								<div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
									<MapPin className="w-4 h-4" />
									{matchedListing.address && `${matchedListing.address}, `}
									{matchedListing.suburb}, {matchedListing.state}
								</div>
							</div>
							<div className="text-right">
								<div className="font-bold text-lg">
									{formatPrice(matchedListing)}
								</div>
								<div className="text-xs text-gray-600">
									{matchedListing.buildingType}
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{/* Map */}
						<div className="h-48 relative">
							{matchedHasExactLocation ? (
								<Map
									location={{
										latitude: matchedListing.latitude!,
										longitude: matchedListing.longitude!,
									}}
									zoom={15}
									interactive={false}
									listings={[matchedListing]}
									className="w-full h-full rounded-none"
								/>
							) : (
								<div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-600">
									Exact location hidden for this listing
								</div>
							)}
						</div>

						{/* Property details */}
						<div className="p-4 space-y-3">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div className="flex items-center gap-2">
									<Bed className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Bedrooms:</span>
									<span className="font-medium">{matchedListing.bedrooms}</span>
								</div>
								<div className="flex items-center gap-2">
									<Bath className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Bathrooms:</span>
									<span className="font-medium">
										{matchedListing.bathrooms}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Car className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Parking:</span>
									<span className="font-medium">{matchedListing.parking}</span>
								</div>
								<div className="flex items-center gap-2">
									<Home className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Type:</span>
									<span className="font-medium">
										{matchedListing.buildingType}
									</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Distance Information */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex items-center justify-center gap-4 text-center">
						<div className="flex items-center gap-2">
							<MapPin className="w-5 h-5 text-blue-600" />
							<span className="font-semibold text-lg">
								Distance: {distanceDisplay}
							</span>
						</div>
						{suburbsMatch && (
							<Badge
								variant="outline"
								className="text-green-600 border-green-600"
							>
								Same Suburb
							</Badge>
						)}
					</div>
					<Separator className="my-4" />
					<div className="grid grid-cols-2 gap-4 text-sm text-center">
						<div>
							<div className="font-medium text-gray-700">Original Location</div>
							<div className="text-gray-600">
								{originalListing.suburb}, {originalListing.state}
							</div>
						</div>
						<div>
							<div className="font-medium text-gray-700">Match Location</div>
							<div className="text-gray-600">
								{matchedListing.suburb}, {matchedListing.state}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
