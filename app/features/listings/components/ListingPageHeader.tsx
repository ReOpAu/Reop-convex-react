import type React from "react";

interface ListingPageHeaderProps {
	title: string;
	description: string;
	children?: React.ReactNode; // For badges and icons
}

export const ListingPageHeader: React.FC<ListingPageHeaderProps> = ({
	title,
	description,
	children,
}) => {
	return (
		<div className="mx-auto max-w-2xl lg:text-center mb-12">
			{children && (
				<div className="flex items-center justify-center gap-2 mb-4">
					{children}
				</div>
			)}
			<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
				{title}
			</h1>
			<p className="mt-6 text-lg leading-8 text-gray-600">{description}</p>
		</div>
	);
};
