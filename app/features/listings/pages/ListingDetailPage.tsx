import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import type React from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import { ListingActions } from "../components/ListingActions";
import { ListingFullCard } from "../components/ListingFullCard";
import { ListingsErrorBoundary } from "../components/ListingsErrorBoundary";
import { MatchCard } from "../components/MatchCard";
import { MicroNavigation } from "../components/MicroNavigation";
import { ListingDetailSkeleton } from "../components/skeletons";
import { useListingById, useMatchesForListing } from "../data/listingsService";
import {
	generateMatchesUrl,
	generateSuburbUrl,
	parseListingParams,
} from "../utils/urlHelpers";

const ListingDetailPage: React.FC = () => {
	const params = useParams({ strict: false });
	const { id: listingId, state, type, suburb } = parseListingParams(params);
	const listing = useListingById(listingId || "");
	const matchesResult = useMatchesForListing(listingId || "", {
		minScore: 60,
		limit: 4,
		includeScoreBreakdown: false,
	});
	const matches = matchesResult?.matches || [];

	if (!listing) {
		return <ListingDetailSkeleton />;
	}

	if (!listing._id) {
		return (
			<ListingsErrorBoundary
				title="Listing not found"
				description="The listing you're looking for doesn't exist or may have been removed."
			/>
		);
	}

	return (
		<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				{/* Header with navigation */}
				<div className="flex items-center gap-4 mb-8">
					<Button variant="ghost" asChild>
						<Link to="/listings">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to Listings
						</Link>
					</Button>
					<MicroNavigation
						paths={[
							{
								label: state?.toUpperCase() || "",
								href: `/listings/${state?.toLowerCase()}`,
							},
							{
								label: `${type ? type.charAt(0).toUpperCase() + type.slice(1) : ""}`,
								href: `/listings/${state?.toLowerCase()}/${type?.toLowerCase()}`,
							},
							{
								label:
									suburb
										?.replace(/-/g, " ")
										.split(" ")
										.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
										.join(" ") || "",
								href: generateSuburbUrl(state || "", type || "", suburb || ""),
							},
							{
								label: listing.headline,
								href: `#`,
							},
						]}
					/>
				</div>

				{/* Main content area */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main listing content */}
					<div className="lg:col-span-2">
						{/* Full listing card */}
						<ListingFullCard listing={listing} />
					</div>

					{/* Sidebar with actions */}
					<div className="lg:col-span-1">
						<ListingActions listing={listing} />
					</div>
				</div>

				{/* Top Matches Section */}
				{matches && matches.length > 0 && (
					<Card className="mt-8">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Top Matching Properties</CardTitle>
								<Button variant="outline" size="sm" asChild>
									<Link to={generateMatchesUrl(listing)}>
										View All Matches
										<ArrowRight className="w-4 h-4 ml-1" />
									</Link>
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{matches.slice(0, 4).map((match) => (
									<MatchCard
										key={match.listing._id}
										originalListing={listing}
										matchedListing={match.listing}
										score={match.score}
										breakdown={match.breakdown}
										compact={true}
									/>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Location info */}
				<div className="mt-8 flex items-center gap-2 text-sm text-gray-600">
					<MapPin className="w-4 h-4" />
					<span>
						{listing.suburb}, {listing.state} {listing.postcode}
					</span>
					<Badge variant="outline">{listing.buildingType}</Badge>
				</div>
			</div>
		</div>
	);
};

export default ListingDetailPage;
