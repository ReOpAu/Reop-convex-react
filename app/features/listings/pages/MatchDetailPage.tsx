import { MapPin } from "lucide-react";
import type React from "react";
import { useParams } from "react-router";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import {
	BasicComparisonSection,
	DetailedComparisonSection,
	MatchTitleSection,
	NavigationSection,
} from "../components";
import { ListingsErrorBoundary } from "../components/ListingsErrorBoundary";
import { MatchDetailSkeleton } from "../components/skeletons";
import { useMatchDetails } from "../data/listingsService";
import {
	calculateLocationInfo,
	calculatePriceComparison,
	getColorClasses,
	getListingTypeInfo,
} from "../utils/matchUtils";
import { parseListingParams } from "../utils/urlHelpers";

const MatchDetailPage: React.FC = () => {
	const params = useParams();
	const { id: originalListingId } = parseListingParams(params);
	const matchedListingId = params.matchId;

	// Get match details efficiently - no client-side filtering needed
	const matchDetails = useMatchDetails(
		originalListingId!,
		matchedListingId!,
		true,
	);

	const originalListing = matchDetails?.originalListing;
	const matchedListing = matchDetails?.matchedListing;
	const score = matchDetails?.score || 0;
	const breakdown = matchDetails?.breakdown;

	// Show loading state while data is being fetched
	const isLoading = !matchDetails;

	if (isLoading) {
		return <MatchDetailSkeleton />;
	}

	if (!originalListing || !matchedListing) {
		return (
			<ListingsErrorBoundary
				title={
					!originalListing
						? "Original listing not found"
						: "Matched listing not found"
				}
				description="One of the listings in this comparison doesn't exist or may have been removed."
			/>
		);
	}

	// Calculate all derived data once
	const listingTypeInfo = getListingTypeInfo(originalListing, matchedListing);
	const colorClasses = getColorClasses(listingTypeInfo);
	const priceComparison = calculatePriceComparison(
		originalListing,
		matchedListing,
	);
	const distance = matchDetails?.distance;
	const locationInfo = calculateLocationInfo(
		originalListing,
		matchedListing,
		distance,
	);

	return (
		<div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
				<div className="space-y-8">
					{/* Navigation Section */}
					<div className="mb-8">
						<NavigationSection
							originalListing={originalListing}
							matchedListing={matchedListing}
						/>
					</div>

					{/* Main Content */}
					<div className="space-y-8">
						{/* Title Section */}
						<div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
							<MatchTitleSection
								originalListing={originalListing}
								matchedListing={matchedListing}
								isOriginalBuyer={listingTypeInfo.isOriginalBuyer}
								isMatchedBuyer={listingTypeInfo.isMatchedBuyer}
								isOriginalSuburbBuyer={listingTypeInfo.isOriginalSuburbBuyer}
								isMatchedSuburbBuyer={listingTypeInfo.isMatchedSuburbBuyer}
								score={score}
								distance={distance}
							/>
						</div>

						{/* Basic Comparison Section */}
						<BasicComparisonSection
							originalListing={originalListing}
							matchedListing={matchedListing}
							listingTypeInfo={listingTypeInfo}
							score={score}
							distance={distance}
							scoreBreakdown={breakdown}
						/>

						{/* Detailed Comparison Section */}
						<DetailedComparisonSection
							originalListing={originalListing}
							matchedListing={matchedListing}
							listingTypeInfo={listingTypeInfo}
							colorClasses={colorClasses}
							locationInfo={locationInfo}
							priceComparison={priceComparison}
							score={score}
							distance={distance}
							scoreBreakdown={breakdown}
						/>

						{/* Distance Information Card */}
						{distance !== undefined && (
							<Card>
								<CardContent className="pt-6">
									<div className="flex items-center gap-2 text-sm">
										<MapPin className="w-4 h-4 text-gray-500" />
										<span className="font-medium">
											Distance between properties:
										</span>
										<Badge variant="outline">{locationInfo.distanceText}</Badge>
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default MatchDetailPage;
