import { api } from "@/convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	Calendar,
	DollarSign,
	Edit,
	Home,
	MapPin,
	Plus,
	TrendingUp,
	Users,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { DeleteListingButton } from "../components/forms";
import { type ConvexListing, formatListingPrice } from "../types";
import { getListingRouteParams } from "../utils/urlHelpers";

const formatPrice = (listing: ConvexListing) => {
	if (listing.priceMin === listing.priceMax) {
		return `$${listing.priceMin.toLocaleString()}`;
	}
	return `$${listing.priceMin.toLocaleString()} - $${listing.priceMax.toLocaleString()}`;
};

const formatDate = (timestamp: number) => {
	return new Date(timestamp).toLocaleDateString();
};

const MyListingCard: React.FC<{
	listing: ConvexListing;
	onDeleteSuccess: () => void;
}> = ({ listing, onDeleteSuccess }) => {
	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<Badge
								variant={
									listing.listingType === "buyer" ? "default" : "secondary"
								}
							>
								{listing.listingType}
							</Badge>
							{listing.buyerType && (
								<Badge variant="outline">{listing.buyerType}</Badge>
							)}
							{listing.sellerType && (
								<Badge variant="outline">{listing.sellerType}</Badge>
							)}
							{listing.isPremium && (
								<Badge variant="destructive">Premium</Badge>
							)}
						</div>
						<CardTitle className="text-lg">{listing.headline}</CardTitle>
					</div>
				</div>
				<div className="flex items-center gap-4 text-sm text-muted-foreground">
					<div className="flex items-center gap-1">
						<MapPin className="w-3 h-3" />
						{listing.suburb}, {listing.state}
					</div>
					<div className="flex items-center gap-1">
						<Calendar className="w-3 h-3" />
						{formatDate(listing.createdAt)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground mb-4 line-clamp-2">
					{listing.description}
				</p>

				<div className="space-y-3">
					<div className="flex items-center gap-4 text-sm">
						<span>{listing.bedrooms} bed</span>
						<span>{listing.bathrooms} bath</span>
						<span>{listing.parking} car</span>
						{listing.buildingType && <span>{listing.buildingType}</span>}
					</div>

					<div className="flex items-center gap-1 text-sm font-medium">
						<DollarSign className="w-3 h-3" />
						{formatPrice(listing)}
					</div>

					{listing.features?.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{listing.features.slice(0, 3).map((feature: string) => (
								<Badge key={feature} variant="outline" className="text-xs">
									{feature}
								</Badge>
							))}
							{listing.features.length > 3 && (
								<Badge variant="outline" className="text-xs">
									+{listing.features.length - 3} more
								</Badge>
							)}
						</div>
					)}
				</div>

				<div className="flex gap-2 mt-4 pt-4 border-t">
					<Button variant="outline" size="sm" asChild className="flex-1">
						<Link
							to="/listings/$state/$type/$suburb/$id/edit"
							params={getListingRouteParams(listing)}
						>
							<Edit className="w-3 h-3 mr-1" />
							Edit
						</Link>
					</Button>
					<DeleteListingButton
						listingId={listing._id!}
						listingTitle={listing.headline}
						onSuccess={onDeleteSuccess}
						variant="outline"
						size="sm"
					>
						Delete
					</DeleteListingButton>
				</div>
			</CardContent>
		</Card>
	);
};

const MyListingsPage: React.FC = () => {
	const [filter, setFilter] = useState<"all" | "buyer" | "seller">("all");
	const myListings = useQuery(api.listings.listMyListings, {});

	const userListings = myListings?.listings || [];

	const filteredListings =
		filter === "all"
			? userListings
			: userListings.filter((listing) => listing.listingType === filter);

	const stats = {
		total: userListings.length,
		buyers: userListings.filter((l) => l.listingType === "buyer").length,
		sellers: userListings.filter((l) => l.listingType === "seller").length,
	};

	const handleDeleteSuccess = () => {};

	if (myListings === undefined) {
		return (
			<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900">
							Loading your listings
						</h1>
						<p className="mt-2 text-gray-600">
							Fetching your latest buyer and seller listings.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
							My Listings
						</h1>
						<p className="mt-4 text-lg text-gray-600">
							Manage your buyer and seller listings
						</p>
					</div>
					<Button asChild>
						<Link to="/listings/create">
							<Plus className="w-4 h-4 mr-2" />
							Create Listing
						</Link>
					</Button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Listings
							</CardTitle>
							<Home className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.total}</div>
							<p className="text-xs text-muted-foreground">
								Your active listings
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Buyer Listings
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.buyers}</div>
							<p className="text-xs text-muted-foreground">
								Properties you're looking for
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Seller Listings
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.sellers}</div>
							<p className="text-xs text-muted-foreground">
								Properties you're selling
							</p>
						</CardContent>
					</Card>
				</div>

				<div className="flex gap-2 mb-6">
					<Button
						variant={filter === "all" ? "default" : "outline"}
						onClick={() => setFilter("all")}
					>
						All ({stats.total})
					</Button>
					<Button
						variant={filter === "buyer" ? "default" : "outline"}
						onClick={() => setFilter("buyer")}
					>
						Buyers ({stats.buyers})
					</Button>
					<Button
						variant={filter === "seller" ? "default" : "outline"}
						onClick={() => setFilter("seller")}
					>
						Sellers ({stats.sellers})
					</Button>
				</div>

				{myListings === undefined ? (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{Array.from({ length: 4 }).map((_, i) => (
							<Card key={i}>
								<CardHeader>
									<Skeleton className="h-6 w-3/4" />
									<Skeleton className="h-4 w-1/2" />
								</CardHeader>
								<CardContent>
									<Skeleton className="h-4 w-full mb-2" />
									<Skeleton className="h-4 w-2/3" />
								</CardContent>
							</Card>
						))}
					</div>
				) : filteredListings.length === 0 ? (
					<Card>
						<CardContent className="text-center py-12">
							<Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
							<h3 className="text-lg font-semibold mb-2">
								{filter === "all" ? "No listings yet" : `No ${filter} listings`}
							</h3>
							<p className="text-muted-foreground mb-4">
								{filter === "all"
									? "Create your first listing to get started"
									: `You haven't created any ${filter} listings yet`}
							</p>
							<Button asChild>
								<Link to="/listings/create">
									<Plus className="w-4 h-4 mr-2" />
									Create Your First Listing
								</Link>
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{filteredListings.map((listing: ConvexListing) => (
							<MyListingCard
								key={listing._id}
								listing={listing}
								onDeleteSuccess={handleDeleteSuccess}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default MyListingsPage;
