import { DollarSign, Eye, Home, MapPin, Star, Users, X } from "lucide-react";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import { Progress } from "../../../components/ui/progress";
import { useMatchComparison } from "../hooks/useMatchComparison";
import type { ConvexListing } from "../types";
import {
	generateListingUrl,
	generateMatchDetailUrl,
} from "../utils/urlHelpers";

const getScoreColor = (score: number) => {
	if (score >= 80) return "text-green-600";
	if (score >= 60) return "text-yellow-600";
	return "text-red-600";
};

const getScoreBgColor = (score: number) => {
	if (score >= 80) return "bg-green-100";
	if (score >= 60) return "bg-yellow-100";
	return "bg-red-100";
};

const ListingSummaryCard: React.FC<{
	listing: ConvexListing;
	label: string;
}> = ({ listing, label }) => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Home className="w-4 h-4" />
				{label}
				<Badge
					variant={listing.listingType === "buyer" ? "default" : "secondary"}
				>
					{listing.listingType}
				</Badge>
			</CardTitle>
		</CardHeader>
		<CardContent className="space-y-3">
			<h4 className="font-semibold">{listing.headline}</h4>
			<div className="flex items-center gap-1 text-sm text-gray-600">
				<MapPin className="w-4 h-4" />
				{listing.suburb}, {listing.state}
			</div>
			<div className="text-sm">
				{listing.bedrooms} bed • {listing.bathrooms} bath • {listing.parking}{" "}
				car
			</div>
			{(listing.priceMin || listing.priceMax) && (
				<div className="flex items-center gap-1 text-sm">
					<DollarSign className="w-4 h-4" />${listing.priceMin.toLocaleString()}{" "}
					- ${listing.priceMax.toLocaleString()}
				</div>
			)}
		</CardContent>
	</Card>
);

const PropertyComparisonGrid: React.FC<{
	propertyComparison: {
		bedrooms: { original: number; match: number; matches: boolean };
		bathrooms: { original: number; match: number; matches: boolean };
		parkingSpaces: { original: number; match: number; matches: boolean };
	};
}> = ({ propertyComparison }) => {
	const fields = [
		{ label: "Bedrooms", data: propertyComparison.bedrooms },
		{ label: "Bathrooms", data: propertyComparison.bathrooms },
		{ label: "Parking", data: propertyComparison.parkingSpaces },
	] as const;

	return (
		<div className="grid grid-cols-3 gap-4 text-sm">
			{fields.map((field) => (
				<div key={field.label} className="text-center">
					<div className="font-medium">{field.label}</div>
					<div className="text-lg font-bold">
						{field.data.original} | {field.data.match}
					</div>
					<Badge
						variant={field.data.matches ? "default" : "destructive"}
						className="text-xs"
					>
						{field.data.matches ? "Match" : "Different"}
					</Badge>
				</div>
			))}
		</div>
	);
};

const FeatureList: React.FC<{
	features: string[];
	label: string;
	colorClass: string;
	variant: "default" | "outline" | "secondary";
}> = ({ features, label, colorClass, variant }) => {
	if (features.length === 0) return null;
	return (
		<div>
			<h5 className={`font-medium ${colorClass} mb-2`}>
				{label} ({features.length})
			</h5>
			<div className="flex flex-wrap gap-1">
				{features.map((feature) => (
					<Badge key={feature} variant={variant} className="text-xs">
						{feature}
					</Badge>
				))}
			</div>
		</div>
	);
};

interface MatchPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	originalListing: ConvexListing;
	matchedListing: ConvexListing;
	matchScore?: number;
}

export const MatchPreviewModal: React.FC<MatchPreviewModalProps> = ({
	isOpen,
	onClose,
	originalListing,
	matchedListing,
	matchScore = 0,
}) => {
	const {
		priceComparison,
		propertyComparison,
		featureComparison,
		distance,
		distanceDisplay,
	} = useMatchComparison(originalListing, matchedListing);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl w-[90vw] h-[85vh] max-h-[85vh] overflow-hidden">
				<DialogHeader>
					<DialogTitle className="flex items-center justify-between">
						Property Match Preview
						<Button
							variant="ghost"
							size="sm"
							onClick={onClose}
							className="h-6 w-6 p-0"
						>
							<X className="h-4 w-4" />
						</Button>
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-auto space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span className="flex items-center gap-2">
									<Star className="w-5 h-5" />
									Match Score
								</span>
								<div
									className={`px-3 py-1 rounded-full ${getScoreBgColor(matchScore)}`}
								>
									<span className={`font-bold ${getScoreColor(matchScore)}`}>
										{Math.round(matchScore)}%
									</span>
								</div>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Progress value={matchScore} className="mb-4" />
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="font-medium">Distance:</span>{" "}
									{distanceDisplay}
								</div>
								<div>
									<span className="font-medium">Same Suburb:</span>{" "}
									{originalListing.suburb === matchedListing.suburb
										? "Yes"
										: "No"}
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ListingSummaryCard
							listing={originalListing}
							label="Original Listing"
						/>
						<ListingSummaryCard
							listing={matchedListing}
							label="Matched Listing"
						/>
					</div>

					{priceComparison && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<DollarSign className="w-5 h-5" />
									Price Comparison
									<Badge
										variant={
											priceComparison.overlap ? "default" : "destructive"
										}
									>
										{priceComparison.overlap ? "Overlap" : "No Overlap"}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2 text-sm">
									<div>
										<span className="font-medium">Average Difference:</span> $
										{priceComparison.difference.toLocaleString()}
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<span className="font-medium">Original Range:</span>
											<br />${priceComparison.original.min.toLocaleString()} - $
											{priceComparison.original.max.toLocaleString()}
										</div>
										<div>
											<span className="font-medium">Match Range:</span>
											<br />${priceComparison.match.min.toLocaleString()} - $
											{priceComparison.match.max.toLocaleString()}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Home className="w-5 h-5" />
								Property Details
							</CardTitle>
						</CardHeader>
						<CardContent>
							<PropertyComparisonGrid propertyComparison={propertyComparison} />
						</CardContent>
					</Card>

					{(originalListing.features?.length ||
						matchedListing.features?.length) && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Star className="w-5 h-5" />
									Features Comparison
									<div className="ml-auto">
										<span className="text-sm font-normal">Match: </span>
										<span className="font-bold">
											{Math.round(featureComparison.matchScore * 100)}%
										</span>
									</div>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<FeatureList
									features={featureComparison.common}
									label="Common Features"
									colorClass="text-green-600"
									variant="default"
								/>
								<FeatureList
									features={featureComparison.onlyInOriginal}
									label="Only in Original"
									colorClass="text-orange-600"
									variant="outline"
								/>
								<FeatureList
									features={featureComparison.onlyInMatch}
									label="Only in Match"
									colorClass="text-blue-600"
									variant="secondary"
								/>
							</CardContent>
						</Card>
					)}

					<div className="flex gap-4">
						<Button variant="outline" asChild className="flex-1">
							<Link to={generateListingUrl(matchedListing)}>
								<Eye className="w-4 h-4 mr-2" />
								View Listing
							</Link>
						</Button>
						<Button asChild className="flex-1">
							<Link
								to={generateMatchDetailUrl(originalListing, matchedListing)}
							>
								<Users className="w-4 h-4 mr-2" />
								Full Comparison
							</Link>
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
