import { api } from "@/convex/_generated/api";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft, Home, MapPin, TrendingUp, Users } from "lucide-react";
import type React from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import { ListingsDisplay } from "../components/ListingsDisplay";
import { MicroNavigation } from "../components/MicroNavigation";

const StateListingsPage: React.FC = () => {
	const { state } = useParams({ strict: false }) as { state?: string };

	// State-specific info (could be moved to a config file)
	const stateInfo = {
		NSW: { name: "New South Wales", capital: "Sydney", abbr: "NSW" },
		VIC: { name: "Victoria", capital: "Melbourne", abbr: "VIC" },
		QLD: { name: "Queensland", capital: "Brisbane", abbr: "QLD" },
		WA: { name: "Western Australia", capital: "Perth", abbr: "WA" },
		SA: { name: "South Australia", capital: "Adelaide", abbr: "SA" },
		TAS: { name: "Tasmania", capital: "Hobart", abbr: "TAS" },
		ACT: {
			name: "Australian Capital Territory",
			capital: "Canberra",
			abbr: "ACT",
		},
		NT: { name: "Northern Territory", capital: "Darwin", abbr: "NT" },
	};

	const currentState = state
		? stateInfo[state.toUpperCase() as keyof typeof stateInfo]
		: null;

	// Fetch listing statistics for the state
	const stats = useQuery(
		api.listings.getStateListingStats,
		currentState ? { state: currentState.abbr } : "skip",
	);

	return (
		<>
			<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
					{/* Header with navigation */}
					<div className="flex items-center gap-4 mb-8">
						<Button variant="ghost" asChild>
							<Link to="/listings">
								<ArrowLeft className="w-4 h-4 mr-2" />
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

					{/* State Header */}
					<div className="mx-auto max-w-2xl lg:text-center mb-12">
						<div className="flex items-center justify-center gap-2 mb-4">
							<MapPin className="w-5 h-5 text-blue-600" />
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

					{/* Quick Stats (could be populated from actual data) */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Total Listings
								</CardTitle>
								<Home className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{stats?.totalListings ?? "--"}
								</div>
								<p className="text-xs text-muted-foreground">
									Active listings in {currentState?.name || state}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Buyers</CardTitle>
								<Users className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{stats?.buyerListings ?? "--"}
								</div>
								<p className="text-xs text-muted-foreground">
									Active buyer listings
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Sellers</CardTitle>
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{stats?.sellerListings ?? "--"}
								</div>
								<p className="text-xs text-muted-foreground">
									Active seller listings
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Listings Display */}
					<ListingsDisplay
						initialFilters={{ state: currentState?.abbr || state || "" }}
					/>
				</div>
			</div>
		</>
	);
};

export default StateListingsPage;
