import type React from "react";
import type { ListingType } from "../types";
import { ImprovedListingsDisplay } from "./ImprovedListingsDisplay";

export interface ListingsDisplayProps {
	initialFilters?: {
		listingType?: ListingType | "all";
		state?: string;
		suburb?: string;
	};
}

/**
 * Context-aware ListingsDisplay component that automatically adjusts filters
 * based on the current page context (state, suburb, type from URL params).
 */
export const ListingsDisplay: React.FC<ListingsDisplayProps> = ({
	initialFilters,
}) => {
	return (
		<ImprovedListingsDisplay
			initialFilters={initialFilters}
			showFilters={{
				listingType: true,
				state: true,
				suburb: true,
			}}
		/>
	);
};
