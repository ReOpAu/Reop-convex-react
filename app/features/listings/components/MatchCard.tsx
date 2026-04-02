import { ArrowRightLeft, Eye, MapPin } from "lucide-react";
import type React from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import type { Listing } from "../types";
import { isBuyerListing } from "../utils";
import { formatDistance } from "../utils";
import {
	generateListingUrl,
	generateMatchDetailUrl,
} from "../utils/urlHelpers";
import { MatchScore } from "./MatchScore";

interface MatchCardProps {
	originalListing: Listing;
	matchedListing: Listing;
	score: number;
	distance?: number;
	breakdown?: any;
	showActions?: boolean;
	compact?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({
	originalListing,
	matchedListing,
	score,
	distance,
	breakdown,
	showActions = true,
	compact = false,
}) => {
	const formatPrice = (listing: Listing) => {
		if (!listing.priceMin || !listing.priceMax) return "Price not specified";
		return `$${listing.priceMin.toLocaleString()} - $${listing.priceMax.toLocaleString()}`;
	};

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className={compact ? "pb-2" : ""}>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="text-lg">{matchedListing.headline}</CardTitle>
						<div className="flex items-center gap-2 mt-1">
							<Badge
								variant={
									matchedListing.listingType === "buyer"
										? "default"
										: "secondary"
								}
							>
								{matchedListing.listingType}
							</Badge>
							<Badge variant="outline">{matchedListing.buildingType}</Badge>
							{isBuyerListing(matchedListing) &&
								matchedListing.buyerType === "street" &&
								matchedListing.searchRadius && (
									<Badge
										variant="outline"
										className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
									>
										{matchedListing.searchRadius}km
									</Badge>
								)}
						</div>
					</div>
					<MatchScore score={score} size="md" />
				</div>
			</CardHeader>
			<CardContent className={compact ? "pt-0" : ""}>
				<div className="space-y-3">
					{/* Location */}
					<div className="flex items-center gap-2 text-sm text-gray-600">
						<MapPin className="w-4 h-4" />
						<span>
							{matchedListing.suburb}, {matchedListing.state}
						</span>
						{distance && (
							<Badge variant="outline" className="text-xs">
								{distance ? formatDistance(distance) : "Distance unknown"} away
							</Badge>
						)}
					</div>

					{/* Price */}
					<div className="text-sm">
						<span className="font-medium">Price: </span>
						{formatPrice(matchedListing)}
					</div>

					{/* Property Details */}
					<div className="flex gap-4 text-sm">
						<span>{matchedListing.bedrooms} bed</span>
						<span>{matchedListing.bathrooms} bath</span>
						<span>{matchedListing.parking} car</span>
					</div>

					{/* Description */}
					{!compact && matchedListing.description && (
						<p className="text-sm text-gray-600 line-clamp-2">
							{matchedListing.description}
						</p>
					)}

					{/* Actions */}
					{showActions && (
						<div className="flex gap-2 pt-2">
							<Button size="sm" variant="outline" asChild>
								<Link to={generateListingUrl(matchedListing)}>
									<Eye className="w-3 h-3 mr-1" />
									View Listing
								</Link>
							</Button>
							<Button size="sm" variant="default" asChild>
								<Link
									to={generateMatchDetailUrl(originalListing, matchedListing)}
								>
									<ArrowRightLeft className="w-3 h-3 mr-1" />
									Compare Details
								</Link>
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
