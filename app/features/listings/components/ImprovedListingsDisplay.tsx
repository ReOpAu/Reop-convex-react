import { api } from "@/convex/_generated/api";
import { getStateInfo } from "@shared/constants/states";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type React from "react";
import { useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useListings } from "../data/listingsService";
import type { ListingType } from "../types";
import { ListingsGrid } from "./ListingsGrid";
import { ListingsGridSkeleton } from "./skeletons";

export interface ImprovedListingsDisplayProps {
	// Filters that can be changed by the user
	showFilters?: {
		listingType?: boolean;
		state?: boolean;
		suburb?: boolean;
	};
	// Initial values for filters
	initialFilters?: {
		listingType?: ListingType | "all";
		state?: string;
		suburb?: string;
	};
}

export const ImprovedListingsDisplay: React.FC<
	ImprovedListingsDisplayProps
> = ({
	showFilters = {
		listingType: true,
		state: true,
		suburb: true,
	},
	initialFilters,
}) => {
	// Get URL params to determine context
	const params = useParams({ strict: false }) as {
		state?: string;
		suburb?: string;
		type?: string;
	};
	const contextState = params.state
		? (getStateInfo(params.state)?.abbr ?? params.state)
		: undefined;
	const contextSuburb = params.suburb;
	const contextType = params.type as ListingType | undefined;

	// Determine actual filters based on context
	const [filters, setFilters] = useState({
		listingType: contextType || initialFilters?.listingType || "all",
		state: contextState || initialFilters?.state || "all",
		suburb: contextSuburb || initialFilters?.suburb || "all",
		page: 1,
	});

	// Fetch available states and suburbs with error handling
	const availableStates = useQuery(api.listings.getAvailableStates);
	const availableSuburbs = useQuery(
		api.listings.getSuburbsByState,
		filters.state && filters.state !== "all"
			? { state: filters.state }
			: "skip",
	);

	// Loading states
	const isLoadingSuburbs =
		filters.state !== "all" &&
		Boolean(filters.state) &&
		availableSuburbs === undefined;

	const { listings, totalPages, isLoading } = useListings(filters);

	// Determine which filters to show based on context
	const shouldShowStateFilter = !contextState && showFilters.state;
	const shouldShowSuburbFilter = !contextSuburb && showFilters.suburb;
	const shouldShowTypeFilter = !contextType && showFilters.listingType;

	const handleFilterChange = (
		name: "listingType" | "state" | "suburb",
		value: string,
	) => {
		const newFilters = { ...filters, [name]: value, page: 1 };

		// Reset suburb when state changes
		if (name === "state" && value !== filters.state) {
			newFilters.suburb = "all";
		}

		setFilters(newFilters);
	};

	const handlePageChange = (page: number) => {
		setFilters({ ...filters, page });
	};

	// Only show filter card if there are filters to display
	const hasVisibleFilters =
		shouldShowStateFilter || shouldShowSuburbFilter || shouldShowTypeFilter;

	return (
		<div>
			{hasVisibleFilters && (
				<Card className="mb-6">
					<CardContent className="pt-6">
						<div className="flex flex-col sm:flex-row gap-4">
							{shouldShowTypeFilter && (
								<div className="flex-1">
									<Select
										value={filters.listingType}
										onValueChange={(value) =>
											handleFilterChange("listingType", value)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select listing type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Types</SelectItem>
											<SelectItem value="buyer">Buyers Only</SelectItem>
											<SelectItem value="seller">Sellers Only</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
							{shouldShowStateFilter && (
								<div className="flex-1">
									<Select
										value={filters.state}
										onValueChange={(value) =>
											handleFilterChange("state", value)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select state" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All States</SelectItem>
											{availableStates?.map((stateAbbr) => {
												const stateInfo = getStateInfo(stateAbbr);
												return (
													<SelectItem key={stateAbbr} value={stateAbbr}>
														{stateInfo?.name || stateAbbr} ({stateAbbr})
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
								</div>
							)}
							{shouldShowSuburbFilter && (
								<div className="flex-1">
									<Select
										value={filters.suburb}
										onValueChange={(value) =>
											handleFilterChange("suburb", value)
										}
										disabled={filters.state === "all" || isLoadingSuburbs}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={
													filters.state === "all"
														? "Select a state first"
														: isLoadingSuburbs
															? "Loading suburbs..."
															: "Select suburb"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Suburbs</SelectItem>
											{availableSuburbs?.map((suburb) => (
												<SelectItem key={suburb} value={suburb}>
													{suburb}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{isLoading ? (
				<ListingsGridSkeleton />
			) : listings.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					No listings found. Try adjusting your filters.
				</div>
			) : (
				<ListingsGrid
					listings={listings}
					pagination={{
						currentPage: filters.page,
						totalPages,
						onPageChange: handlePageChange,
					}}
				/>
			)}
		</div>
	);
};
