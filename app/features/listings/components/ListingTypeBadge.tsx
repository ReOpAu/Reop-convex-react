import { TrendingUp, Users } from "lucide-react";
import type React from "react";
import { Badge } from "~/components/ui/badge";
import type { ListingType } from "../types";

interface ListingTypeBadgeProps {
	listingType: ListingType;
	showIcon?: boolean;
	iconSize?: "sm" | "md";
}

export const ListingTypeBadge: React.FC<ListingTypeBadgeProps> = ({
	listingType,
	showIcon = true,
	iconSize = "md",
}) => {
	const iconClass = iconSize === "sm" ? "w-4 h-4" : "w-5 h-5";
	const isBuyer = listingType === "buyer";

	return (
		<>
			{showIcon &&
				(isBuyer ? (
					<Users
						className={`${iconClass} text-blue-600`}
						aria-hidden="true"
					/>
				) : (
					<TrendingUp
						className={`${iconClass} text-green-600`}
						aria-hidden="true"
					/>
				))}
			<Badge variant={isBuyer ? "default" : "secondary"}>{listingType}</Badge>
		</>
	);
};
