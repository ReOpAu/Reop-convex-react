import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
	Calendar,
	DollarSign,
	Edit,
	Eye,
	Filter,
	MapPin,
	Plus,
	Search,
	User,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import type { ConvexListing } from "../../types";
import { DeleteListingButton } from "../forms";

interface AdminListingsTableProps {
	onCreateListing?: () => void;
}

export const AdminListingsTable: React.FC<AdminListingsTableProps> = ({
	onCreateListing,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [typeFilter, setTypeFilter] = useState<"all" | "buyer" | "seller">(
		"all",
	);
	const [stateFilter, setStateFilter] = useState("");
	const [page, setPage] = useState(1);
	const pageSize = 20;

	// Query all listings with pagination
	const listingsData = useQuery(api.listings.listListingsAdmin, {
		listingType: typeFilter === "all" ? undefined : typeFilter,
		state:
			stateFilter && stateFilter !== "all-states" ? stateFilter : undefined,
		page,
		pageSize,
	});

	const formatPrice = (listing: ConvexListing) => {
		if (!listing.priceMin || !listing.priceMax) return "Not set";
		if (listing.priceMin === listing.priceMax)
			return `$${listing.priceMin.toLocaleString()}`;
		return `$${listing.priceMin.toLocaleString()} - $${listing.priceMax.toLocaleString()}`;
	};

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-AU", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const handleDeleteSuccess = () => {
		// Refetch will happen automatically due to Convex reactivity
	};

	// Filter listings by search term (client-side for now)
	const filteredListings =
		listingsData?.listings?.filter((listing: ConvexListing) => {
			if (!searchTerm) return true;
			const searchLower = searchTerm.toLowerCase();
			return (
				listing.headline.toLowerCase().includes(searchLower) ||
				listing.description.toLowerCase().includes(searchLower) ||
				listing.suburb.toLowerCase().includes(searchLower) ||
				listing.state.toLowerCase().includes(searchLower) ||
				(listing.buildingType || "").toLowerCase().includes(searchLower)
			);
		}) || [];

	// Get unique states for filter dropdown
	const availableStates = Array.from(
		new Set(
			listingsData?.listings
				?.map((l) => l.state)
				.filter((state) => state && state.trim() !== "") || [],
		),
	).sort();

	return (
		<div className="space-y-6">
			{/* Header and Controls */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Admin: All Listings
					</h2>
					<p className="text-muted-foreground">
						Manage all buyer and seller listings across the platform
					</p>
				</div>
				<Button onClick={onCreateListing}>
					<Plus className="w-4 h-4 mr-2" />
					Create Listing
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center">
				<div className="flex items-center gap-2 flex-1">
					<Search className="w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search listings..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="max-w-sm"
					/>
				</div>

				<div className="flex items-center gap-2">
					<Filter className="w-4 h-4 text-muted-foreground" />
					<Select
						value={typeFilter}
						onValueChange={(value: "all" | "buyer" | "seller") =>
							setTypeFilter(value)
						}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							<SelectItem value="buyer">Buyers</SelectItem>
							<SelectItem value="seller">Sellers</SelectItem>
						</SelectContent>
					</Select>

					<Select value={stateFilter} onValueChange={setStateFilter}>
						<SelectTrigger className="w-32">
							<SelectValue placeholder="All States" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all-states">All States</SelectItem>
							{availableStates.map((state) => (
								<SelectItem key={state} value={state}>
									{state}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Statistics */}
			{listingsData && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-muted/50 p-4 rounded-lg">
						<div className="text-2xl font-bold">
							{listingsData.pagination.totalCount}
						</div>
						<div className="text-sm text-muted-foreground">Total Listings</div>
					</div>
					<div className="bg-muted/50 p-4 rounded-lg">
						<div className="text-2xl font-bold">
							{
								listingsData.listings.filter((l) => l.listingType === "buyer")
									.length
							}
						</div>
						<div className="text-sm text-muted-foreground">Buyers</div>
					</div>
					<div className="bg-muted/50 p-4 rounded-lg">
						<div className="text-2xl font-bold">
							{
								listingsData.listings.filter((l) => l.listingType === "seller")
									.length
							}
						</div>
						<div className="text-sm text-muted-foreground">Sellers</div>
					</div>
					<div className="bg-muted/50 p-4 rounded-lg">
						<div className="text-2xl font-bold">{availableStates.length}</div>
						<div className="text-sm text-muted-foreground">States</div>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Listing</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Location</TableHead>
							<TableHead>Property</TableHead>
							<TableHead>Price</TableHead>
							<TableHead>User</TableHead>
							<TableHead>Created</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{listingsData === undefined ? (
							// Loading state
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 8 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : filteredListings.length === 0 ? (
							// Empty state
							<TableRow>
								<TableCell colSpan={8} className="text-center py-8">
									<div className="text-muted-foreground">
										{searchTerm ||
										typeFilter !== "all" ||
										(stateFilter && stateFilter !== "all-states")
											? "No listings match your filters"
											: "No listings found"}
									</div>
								</TableCell>
							</TableRow>
						) : (
							// Data rows
							filteredListings.map((listing: ConvexListing) => (
								<TableRow key={listing._id}>
									{/* Listing Info */}
									<TableCell className="max-w-xs">
										<div>
											<div className="font-medium truncate">
												{listing.headline}
											</div>
											<div className="text-sm text-muted-foreground truncate">
												{listing.description}
											</div>
										</div>
									</TableCell>

									{/* Type */}
									<TableCell>
										<div className="flex flex-col gap-1">
											<Badge
												variant={
													listing.listingType === "buyer"
														? "default"
														: "secondary"
												}
											>
												{listing.listingType}
											</Badge>
											{listing.listingType === "buyer" && listing.buyerType && (
												<Badge variant="outline" className="text-xs">
													{listing.buyerType}
												</Badge>
											)}
											{listing.listingType === "seller" &&
												listing.sellerType && (
													<Badge variant="outline" className="text-xs">
														{listing.sellerType}
													</Badge>
												)}
										</div>
									</TableCell>

									{/* Location */}
									<TableCell>
										<div className="flex items-center gap-1 text-sm">
											<MapPin className="w-3 h-3" />
											<span>
												{listing.suburb}, {listing.state}
											</span>
										</div>
										<div className="text-xs text-muted-foreground">
											{listing.postcode}
										</div>
									</TableCell>

									{/* Property Details */}
									<TableCell>
										<div className="text-sm">
											{listing.bedrooms}br / {listing.bathrooms}ba
										</div>
										<div className="text-xs text-muted-foreground">
											{listing.buildingType}
										</div>
									</TableCell>

									{/* Price */}
									<TableCell>
										<div className="flex items-center gap-1 text-sm">
											<DollarSign className="w-3 h-3" />
											<span>{formatPrice(listing)}</span>
										</div>
									</TableCell>

									{/* User */}
									<TableCell>
										<div className="flex items-center gap-1 text-sm">
											<User className="w-3 h-3" />
											<span className="truncate max-w-20">
												{String(listing.userId)}
											</span>
										</div>
									</TableCell>

									{/* Created */}
									<TableCell>
										<div className="flex items-center gap-1 text-sm">
											<Calendar className="w-3 h-3" />
											<span>{formatDate(listing.createdAt)}</span>
										</div>
									</TableCell>

									{/* Actions */}
									<TableCell>
										<div className="flex items-center gap-1">
											<Button variant="ghost" size="sm" asChild>
												<Link
													to={`/listings/${listing.state.toLowerCase()}/${listing.listingType}/${listing.suburb.toLowerCase().replace(/\s+/g, "-")}/${listing._id}`}
												>
													<Eye className="w-3 h-3" />
												</Link>
											</Button>
											<Button variant="ghost" size="sm" asChild>
												<Link to={`/admin/listings/edit/${listing._id}`}>
													<Edit className="w-3 h-3" />
												</Link>
											</Button>
											<DeleteListingButton
												listingId={listing._id! as any}
												listingTitle={listing.headline}
												onSuccess={handleDeleteSuccess}
												variant="ghost"
												size="sm"
											>
												<span className="sr-only">Delete</span>
											</DeleteListingButton>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{listingsData && listingsData.pagination.totalPages > 1 && (
				<div className="flex items-center justify-between">
					<div className="text-sm text-muted-foreground">
						Showing {(page - 1) * pageSize + 1} to{" "}
						{Math.min(page * pageSize, listingsData.pagination.totalCount)} of{" "}
						{listingsData.pagination.totalCount} listings
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage(page - 1)}
							disabled={!listingsData.pagination.hasPreviousPage}
						>
							Previous
						</Button>
						<span className="text-sm">
							Page {page} of {listingsData.pagination.totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage(page + 1)}
							disabled={!listingsData.pagination.hasNextPage}
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};
