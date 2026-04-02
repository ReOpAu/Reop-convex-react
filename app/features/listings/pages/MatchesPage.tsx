import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Eye } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "../../../components/ui/pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../../components/ui/table";
import { ListingsErrorBoundary } from "../components/ListingsErrorBoundary";
import { MatchScore } from "../components/MatchScore";
import { MatchesTableSkeleton } from "../components/skeletons";
import { useListingById, useMatchesForListing } from "../data/listingsService";
import { formatDistance, isBuyerListing } from "../utils";
import {
	generateListingUrl,
	generateMatchDetailUrl,
	parseListingParams,
} from "../utils/urlHelpers";

// Helper function for pagination (reused from ListingsGrid)
function generatePaginationItems(currentPage: number, totalPages: number) {
	const items: Array<{ type: "page" | "ellipsis"; page?: number }> = [];

	if (totalPages > 0) {
		items.push({ type: "page", page: 1 });
	}

	const startPage = Math.max(2, currentPage - 1);
	const endPage = Math.min(totalPages - 1, currentPage + 1);

	if (startPage > 2) {
		items.push({ type: "ellipsis" });
	}

	for (let page = startPage; page <= endPage; page++) {
		if (page !== 1 && page !== totalPages) {
			items.push({ type: "page", page });
		}
	}

	if (endPage < totalPages - 1) {
		items.push({ type: "ellipsis" });
	}

	if (totalPages > 1) {
		items.push({ type: "page", page: totalPages });
	}

	return items;
}

const MatchesPage: React.FC = () => {
	const params = useParams({ strict: false });
	const { id: listingId } = parseListingParams(params);
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 12; // 12 matches per page

	const listing = useListingById(listingId!);
	const {
		matches,
		totalCount,
		hasMore,
		isLoading: matchesLoading,
	} = useMatchesForListing(listingId!, {
		minScore: 0,
		limit: pageSize,
		offset: (currentPage - 1) * pageSize,
		includeScoreBreakdown: true,
	});

	// Calculate total pages for pagination
	const totalPages = Math.ceil(totalCount / pageSize);

	if (!listing) {
		return (
			<ListingsErrorBoundary
				title="Listing not found"
				description="The listing you're looking for doesn't exist or may have been removed."
			/>
		);
	}

	return (
		<div className="container mx-auto py-8">
			{/* Header */}
			<div className="flex items-center gap-4 mb-6">
				<Button variant="ghost" asChild>
					<Link to={generateListingUrl(listing)}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Listing
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-bold">Matches for {listing.headline}</h1>
					<p className="text-gray-600">
						{listing.suburb}, {listing.state} {listing.postcode}
					</p>
				</div>
			</div>

			{/* Original Listing Summary */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						Original Listing
						<Badge
							variant={
								listing.listingType === "buyer" ? "default" : "secondary"
							}
						>
							{listing.listingType}
						</Badge>
						<Badge variant="outline">
							{listing.buyerType || listing.sellerType}
						</Badge>
						{isBuyerListing(listing) &&
							listing.buyerType === "street" &&
							listing.searchRadius && (
								<Badge
									variant="outline"
									className="bg-blue-50 text-blue-700 border-blue-200"
								>
									{listing.searchRadius}km radius
								</Badge>
							)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="font-medium">{listing.headline}</p>
							<p className="text-sm text-gray-600">{listing.description}</p>
						</div>
						<div className="text-sm">
							<p>
								<strong>Bedrooms:</strong> {listing.bedrooms}
							</p>
							<p>
								<strong>Bathrooms:</strong> {listing.bathrooms}
							</p>
							<p>
								<strong>Parking:</strong> {listing.parking}
							</p>
							<p>
								<strong>Price:</strong> ${listing.priceMin.toLocaleString()} - $
								{listing.priceMax.toLocaleString()}
							</p>
							{isBuyerListing(listing) &&
								listing.buyerType === "street" &&
								listing.searchRadius && (
									<p>
										<strong>Search Radius:</strong> {listing.searchRadius}km
									</p>
								)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Matches Table */}
			<Card>
				<CardHeader>
					<div className="flex justify-between items-start">
						<div>
							<CardTitle>Matching Properties</CardTitle>
							{isBuyerListing(listing) &&
								listing.buyerType === "street" &&
								listing.searchRadius && (
									<p className="text-sm text-gray-600 mt-1">
										Showing matches within {listing.searchRadius}km radius
									</p>
								)}
							{listing.listingType === "seller" && (
								<p className="text-sm text-gray-600 mt-1">
									Street buyer matches are filtered by their search radius
								</p>
							)}
						</div>
						{!matchesLoading && totalCount > 0 && (
							<div className="text-sm text-gray-500">
								Showing {(currentPage - 1) * pageSize + 1}-
								{Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
								matches
							</div>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{matchesLoading ? (
						<MatchesTableSkeleton />
					) : !matches || matches.length === 0 ? (
						<Alert>
							<AlertDescription>
								No matches found for this listing.
							</AlertDescription>
						</Alert>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Property</TableHead>
									<TableHead>Match Score</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Distance</TableHead>
									<TableHead>Price</TableHead>
									<TableHead>Details</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{matches.map((match) => (
									<TableRow key={match.listing._id}>
										<TableCell>
											<div>
												<p className="font-medium">{match.listing.headline}</p>
												<div className="flex gap-1 mt-1">
													<Badge
														variant={
															match.listing.listingType === "buyer"
																? "default"
																: "secondary"
														}
													>
														{match.listing.listingType}
													</Badge>
													<Badge variant="outline" className="text-xs">
														{match.listing.buyerType ||
															match.listing.sellerType}
													</Badge>
													{isBuyerListing(match.listing) &&
														match.listing.buyerType === "street" &&
														match.listing.searchRadius && (
															<Badge
																variant="outline"
																className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
															>
																{match.listing.searchRadius}km
															</Badge>
														)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<MatchScore score={match.score} size="sm" />
										</TableCell>
										<TableCell>
											<div className="text-sm">
												<p>{match.listing.suburb}</p>
												<p className="text-gray-500">{match.listing.state}</p>
											</div>
										</TableCell>
										<TableCell>
											{typeof match.distance === "number" ? (
												<div className="text-sm">
													{(() => {
														const distance = match.distance;
														const isWithinRadius =
															(isBuyerListing(listing) &&
																listing.buyerType === "street" &&
																listing.searchRadius &&
																distance <= listing.searchRadius) ||
															(isBuyerListing(match.listing) &&
																match.listing.buyerType === "street" &&
																match.listing.searchRadius &&
																distance <= match.listing.searchRadius);

														return (
															<div>
																<p>{formatDistance(distance)}</p>
																{isWithinRadius && (
																	<Badge
																		variant="outline"
																		className="bg-green-50 text-green-700 border-green-200 text-xs"
																	>
																		Within radius
																	</Badge>
																)}
															</div>
														);
													})()}
												</div>
											) : (
												<span className="text-gray-400 text-sm">N/A</span>
											)}
										</TableCell>
										<TableCell>
											<div className="text-sm">
												<p>
													${match.listing.priceMin.toLocaleString()} - $
													{match.listing.priceMax.toLocaleString()}
												</p>
											</div>
										</TableCell>
										<TableCell>
											<div className="text-sm">
												<p>
													{match.listing.bedrooms}bed, {match.listing.bathrooms}
													bath
												</p>
												<p>{match.listing.parking} parking</p>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex gap-2">
												<Button size="sm" variant="outline" asChild>
													<Link to={generateListingUrl(match.listing)}>
														<Eye className="w-3 h-3 mr-1" />
														View
													</Link>
												</Button>
												<Button size="sm" variant="default" asChild>
													<Link
														to={generateMatchDetailUrl(listing, match.listing)}
													>
														Compare
													</Link>
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}

					{/* Pagination Controls */}
					{!matchesLoading &&
						matches &&
						matches.length > 0 &&
						totalPages > 1 && (
							<div className="mt-6">
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											<PaginationPrevious
												href="#"
												onClick={(e) => {
													e.preventDefault();
													if (currentPage > 1) {
														setCurrentPage(currentPage - 1);
													}
												}}
												className={
													currentPage === 1
														? "pointer-events-none opacity-50"
														: ""
												}
											/>
										</PaginationItem>

										{generatePaginationItems(currentPage, totalPages).map(
											(item, index) => (
												<PaginationItem
													key={
														item.type === "page"
															? `page-${item.page}`
															: `ellipsis-${index}`
													}
												>
													{item.type === "page" ? (
														<PaginationLink
															href="#"
															onClick={(e) => {
																e.preventDefault();
																if (item.page) {
																	setCurrentPage(item.page);
																}
															}}
															isActive={item.page === currentPage}
															className={
																item.page === currentPage
																	? "bg-primary text-primary-foreground hover:bg-primary/90 font-bold ring-2 ring-primary/20 shadow-md"
																	: ""
															}
														>
															{item.page}
														</PaginationLink>
													) : (
														<PaginationEllipsis />
													)}
												</PaginationItem>
											),
										)}

										<PaginationItem>
											<PaginationNext
												href="#"
												onClick={(e) => {
													e.preventDefault();
													if (currentPage < totalPages) {
														setCurrentPage(currentPage + 1);
													}
												}}
												className={
													currentPage === totalPages
														? "pointer-events-none opacity-50"
														: ""
												}
											/>
										</PaginationItem>
									</PaginationContent>
								</Pagination>
							</div>
						)}
				</CardContent>
			</Card>
		</div>
	);
};

export default MatchesPage;
