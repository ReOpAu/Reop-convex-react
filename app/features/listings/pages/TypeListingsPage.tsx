import { useParams } from "@tanstack/react-router";
import type React from "react";
import { BackNavigationButton } from "../components/BackNavigationButton";
import { ListingPageHeader } from "../components/ListingPageHeader";
import { ListingPageLayout } from "../components/ListingPageLayout";
import { ListingTypeBadge } from "../components/ListingTypeBadge";
import { ListingsDisplay } from "../components/ListingsDisplay";
import { MicroNavigation } from "../components/MicroNavigation";
import type { ListingType } from "../types";
import { capitalize, formatStateAbbr } from "../utils/formatting";

const TypeListingsPage: React.FC = () => {
	const { state, type } = useParams({ strict: false }) as {
		state?: string;
		type?: string;
	};
	const listingType: ListingType = type === "seller" ? "seller" : "buyer";
	const stateLabel = formatStateAbbr(state);
	const typeLabel = capitalize(type);

	const title = `${listingType === "buyer" ? "Buyers" : "Sellers"} in ${stateLabel || state || ""}`;
	const description =
		listingType === "buyer"
			? `Browse property requirements from buyers looking for properties in ${stateLabel || state}.`
			: `Browse properties available from sellers in ${stateLabel || state}.`;

	return (
		<ListingPageLayout>
			<div className="flex items-center gap-4 mb-8">
				<BackNavigationButton
					to="/listings/$state"
					params={{ state: state ?? "" }}
					label={`Back to ${stateLabel || state || "state"}`}
				/>
				<MicroNavigation
					paths={[
						{
							label: stateLabel,
							href: `/listings/${state?.toLowerCase()}`,
						},
						{
							label: `${typeLabel} Listings`,
							href: `/listings/${state?.toLowerCase()}/${type?.toLowerCase()}`,
						},
					]}
				/>
			</div>

			<ListingPageHeader title={title} description={description}>
				<ListingTypeBadge listingType={listingType} />
			</ListingPageHeader>

			<ListingsDisplay
				initialFilters={{
					state: stateLabel || state || "",
					listingType,
				}}
			/>
		</ListingPageLayout>
	);
};

export default TypeListingsPage;
