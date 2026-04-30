import type React from "react";

interface ListingPageLayoutProps {
	children: React.ReactNode;
	maxWidth?: "4xl" | "7xl";
}

export const ListingPageLayout: React.FC<ListingPageLayoutProps> = ({
	children,
	maxWidth = "7xl",
}) => {
	const maxWidthClass = maxWidth === "4xl" ? "max-w-4xl" : "max-w-7xl";

	return (
		<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div
				className={`mx-auto ${maxWidthClass} px-4 sm:px-6 lg:px-8 py-12 sm:py-16`}
			>
				{children}
			</div>
		</div>
	);
};
