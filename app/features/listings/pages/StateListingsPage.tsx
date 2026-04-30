import { api } from "@/convex/_generated/api";
import { getStateInfo } from "@shared/constants/states";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft, Home, MapPin, TrendingUp, Users } from "lucide-react";
import type React from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { StatisticsCard } from "../../../components/ui/statistics-card";
import { ListingsDisplay } from "../components/ListingsDisplay";
import { MicroNavigation } from "../components/MicroNavigation";

const StateListingsPage: React.FC = () => {
	const { state } = useParams({ strict: false }) as { state?: string };
	const currentState = state ? getStateInfo(state) : null;

	if (!currentState && state) {
		return (
			<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
					<div className="text-center">
						<h1 className="text-2xl font-semibold text-gray-900">
							Invalid State
						</h1>
						<p className="mt-2 text-gray-600">
							The state "{state}" was not found.
						</p>
						<Button variant="outline" asChild className="mt-4">
							<Link to="/listings">
								<ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
								Back to All Listings
							</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	const stats = useQuery(
		api.listings.getStateListingStats,
		currentState ? { state: currentState.abbr } : "skip",
	);

	return (
		<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				<div className="flex items-center gap-4 mb-8">
					<Button variant="ghost" asChild>
						<Link to="/listings" aria-label="Navigate back to all listings">
							<ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
							All Listings
						</Link>
					</Button>
					<MicroNavigation
						paths={[
							{
								label: currentState?.name || state || "",
								href: `/listings/${state?.toLowerCase()}`,
							},
						]}
					/>
				</div>

				<div className="mx-auto max-w-2xl lg:text-center mb-12">
					<div className="flex items-center justify-center gap-2 mb-4">
						<MapPin className="w-5 h-5 text-blue-600" aria-hidden="true" />
						<Badge variant="secondary">{currentState?.abbr || state}</Badge>
					</div>
					<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						Property Listings in {currentState?.name || state}
					</h1>
					<p className="mt-6 text-lg leading-8 text-gray-600">
						Browse and search property listings from buyers and sellers in{" "}
						{currentState?.name || state}.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<StatisticsCard
						title="Total Listings"
						value={stats?.totalListings ?? "--"}
						description={`Active listings in ${currentState?.name || state}`}
						icon={Home}
					/>
					<StatisticsCard
						title="Buyers"
						value={stats?.buyerListings ?? "--"}
						description="Active buyer listings"
						icon={Users}
					/>
					<StatisticsCard
						title="Sellers"
						value={stats?.sellerListings ?? "--"}
						description="Active seller listings"
						icon={TrendingUp}
					/>
				</div>

				<section aria-label="Property listings">
					<ListingsDisplay />
				</section>
			</div>
		</div>
	);
};

export default StateListingsPage;
