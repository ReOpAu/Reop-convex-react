import type React from "react";
import { Badge } from "../../../components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "../../../components/ui/carousel";
import { Separator } from "../../../components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableRow,
} from "../../../components/ui/table";
import type { Listing } from "../types";
import { isBuyerListing } from "../utils";
import { Map } from "./Map";
import { PropertyFeatures } from "./PropertyFeatures";
import { StreetViewButton } from "./StreetViewButton";

export interface ListingFullCardProps {
	listing: Listing;
}

export const ListingFullCard: React.FC<ListingFullCardProps> = ({
	listing,
}) => {
	const hasExactLocation =
		listing.hasExactLocation !== false &&
		typeof listing.latitude === "number" &&
		typeof listing.longitude === "number" &&
		typeof listing.geohash === "string" &&
		listing.geohash.length > 0;

	return (
		<div className="space-y-6">
			{/* Image Gallery */}
			{listing.images && listing.images.length > 0 && (
				<Card>
					<CardContent className="p-0">
						<Carousel className="w-full">
							<CarouselContent>
								{listing.images.map((image) => (
									<CarouselItem key={image}>
										<div className="aspect-video relative">
											<img
												src={image}
												alt={listing.headline}
												className="w-full h-full object-cover rounded-t-lg"
											/>
										</div>
									</CarouselItem>
								))}
							</CarouselContent>
							{listing.images.length > 1 && (
								<>
									<CarouselPrevious className="left-4" />
									<CarouselNext className="right-4" />
								</>
							)}
						</Carousel>
					</CardContent>
				</Card>
			)}

			{/* Location Map */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Location</CardTitle>
				</CardHeader>
				<CardContent>
					{hasExactLocation ? (
						<div className="space-y-4">
							<Map
								location={{
									latitude: listing.latitude!,
									longitude: listing.longitude!,
								}}
								zoom={15}
								interactive={true}
								geohash={listing.geohash}
								listings={[listing]}
								className="w-full h-[300px] rounded-lg"
							/>

							<div className="flex justify-center">
								<StreetViewButton
									lat={listing.latitude!}
									lng={listing.longitude!}
									variant="outline"
									size="sm"
								/>
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							Exact location is hidden on public listing views.
						</p>
					)}
				</CardContent>
			</Card>

			{/* Main Details */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="text-2xl mb-2">
								{listing.headline}
							</CardTitle>
							<div className="flex gap-2 mb-2">
								<Badge
									variant={
										listing.listingType === "buyer" ? "default" : "secondary"
									}
								>
									{listing.listingType}
								</Badge>
								{listing.listingType === "buyer" && listing.buyerType && (
									<Badge variant="outline">{listing.buyerType}</Badge>
								)}
								{listing.listingType === "seller" && listing.sellerType && (
									<Badge variant="outline">{listing.sellerType}</Badge>
								)}
								{isBuyerListing(listing) &&
									listing.buyerType === "street" &&
									listing.searchRadius && (
										<Badge
											variant="outline"
											className="bg-blue-50 text-blue-700 border-blue-200"
										>
											{listing.searchRadius}km radius
										</Badge>
									)}
								{listing.isPremium && (
									<Badge variant="destructive">Premium</Badge>
								)}
							</div>
							<p className="text-gray-600">
								{listing.suburb}, {listing.state} {listing.postcode}
							</p>
						</div>
						<div className="text-right">
							{listing.priceMin && listing.priceMax && (
								<div className="text-2xl font-bold text-primary">
									${listing.priceMin.toLocaleString()} - $
									{listing.priceMax.toLocaleString()}
								</div>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-gray-700 mb-4">{listing.description}</p>
					<Separator className="my-4" />

					{/* Property Details Table */}
					<div className="mb-6">
						<h3 className="text-lg font-semibold mb-3">Property Details</h3>
						<Table>
							<TableBody>
								<TableRow>
									<TableCell className="font-medium">Bedrooms</TableCell>
									<TableCell>{listing.bedrooms}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Bathrooms</TableCell>
									<TableCell>{listing.bathrooms}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Parking Spaces</TableCell>
									<TableCell>{listing.parking}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Building Type</TableCell>
									<TableCell>{listing.buildingType}</TableCell>
								</TableRow>
								{isBuyerListing(listing) &&
									listing.buyerType === "street" &&
									listing.searchRadius && (
										<TableRow>
											<TableCell className="font-medium">
												Search Radius
											</TableCell>
											<TableCell>{listing.searchRadius}km</TableCell>
										</TableRow>
									)}
							</TableBody>
						</Table>
					</div>

					{/* Features */}
					{listing.features && listing.features.length > 0 && (
						<>
							<Separator className="my-4" />
							<PropertyFeatures features={listing.features} />
						</>
					)}

					{/* Listing Metadata */}
					<Separator className="my-4" />
					<div className="text-sm text-gray-500">
						<p>Created: {new Date(listing.createdAt).toLocaleDateString()}</p>
						<p>Updated: {new Date(listing.updatedAt).toLocaleDateString()}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
