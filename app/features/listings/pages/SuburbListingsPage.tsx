import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, MapPin, TrendingUp, Users } from "lucide-react";
import type React from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { ListingsDisplay } from "../components/ListingsDisplay";
import { MicroNavigation } from "../components/MicroNavigation";
import type { ListingType } from "../types";

const SuburbListingsPage: React.FC = () => {
	const { state, type, suburb } = useParams({ strict: false }) as {
		state?: string;
		type?: string;
		suburb?: string;
	};
	const listingType = type as ListingType;

	return (
		<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				{/* Header with navigation */}
				<div className="flex items-center gap-4 mb-8">
					<Button variant="ghost" asChild>
						<Link
							to="/listings/$state/$type"
							params={{ state: state ?? "", type: type ?? "" }}
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to {type}s
						</Link>
					</Button>
					<MicroNavigation
						paths={[
							{
								label: state?.toUpperCase() || "",
								href: `/listings/${state?.toLowerCase()}`,
							},
							{
								label: `${type ? type.charAt(0).toUpperCase() + type.slice(1) : ""} Listings`,
								href: `/listings/${state?.toLowerCase()}/${type?.toLowerCase()}`,
							},
							{
								label:
									suburb
										?.replace(/-/g, " ")
										.split(" ")
										.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
										.join(" ") || "",
								href: `/listings/${state?.toLowerCase()}/${type?.toLowerCase()}/${suburb}`,
							},
						]}
					/>
				</div>

				{/* Suburb Header */}
				<div className="mx-auto max-w-2xl lg:text-center mb-12">
					<div className="flex items-center justify-center gap-2 mb-4">
						<MapPin className="w-5 h-5 text-blue-600" />
						<Badge variant="outline">
							{suburb}, {state}
						</Badge>
						{listingType === "buyer" ? (
							<Users className="w-5 h-5 text-blue-600" />
						) : (
							<TrendingUp className="w-5 h-5 text-green-600" />
						)}
						<Badge variant={listingType === "buyer" ? "default" : "secondary"}>
							{listingType}
						</Badge>
					</div>
					<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						{listingType === "buyer" ? "Buyers" : "Sellers"} in {suburb}
					</h1>
					<p className="mt-6 text-lg leading-8 text-gray-600">
						{listingType === "buyer"
							? "Browse property requirements from buyers looking for properties in "
							: "Browse properties available from sellers in "}
						{suburb}, {state}.
					</p>
				</div>

				{/* Listings Display */}
				<ListingsDisplay />
			</div>
		</div>
	);
};

export default SuburbListingsPage;
