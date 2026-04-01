import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { AlertCircle, Home, Search } from "lucide-react";
import ngeohash from "ngeohash";
import type React from "react";
import { useState } from "react";
import {
	type BuildingType,
	type BuyerType,
	DEFAULT_BATHROOMS,
	DEFAULT_BEDROOMS,
	DEFAULT_PARKING,
	DEFAULT_SEARCH_RADIUS,
	type Feature,
} from "../../../../../shared/constants/listingConstants";
import {
	DEFAULT_MAX_PRICE,
	DEFAULT_MIN_PRICE,
} from "../../../../../shared/constants/listingPrices";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { Button } from "../../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Switch } from "../../../../components/ui/switch";
import { Textarea } from "../../../../components/ui/textarea";
import { BuyerTypeFields } from "./shared/BuyerTypeFields";
import { FeaturesFields } from "./shared/FeaturesFields";
import { LocationFields } from "./shared/LocationFields";
import { PriceFields } from "./shared/PriceFields";
import { PropertyDetailsFields } from "./shared/PropertyDetailsFields";

interface CreateBuyerListingFormProps {
	onSuccess?: (listingId: string) => void;
	onCancel?: () => void;
}

interface BuyerFormData {
	buyerType: BuyerType;
	buildingType: BuildingType | "";
	headline: string;
	description: string;
	suburb: string;
	state: string;
	postcode: string;
	address: string;
	latitude: number;
	longitude: number;
	bedrooms: number;
	bathrooms: number;
	parking: number;
	priceMin: number;
	priceMax: number;
	features: Feature[];
	searchRadius: number;
	isPremium: boolean;
	contactEmail: string;
	contactPhone: string;
}

export const CreateBuyerListingForm: React.FC<CreateBuyerListingFormProps> = ({
	onSuccess,
	onCancel,
}) => {
	const { user } = useUser();
	const createListing = useMutation(api.listings.createListing);

	const [formData, setFormData] = useState<BuyerFormData>({
		buyerType: "suburb",
		buildingType: "",
		headline: "",
		description: "",
		suburb: "",
		state: "",
		postcode: "",
		address: "",
		latitude: 0,
		longitude: 0,
		bedrooms: DEFAULT_BEDROOMS,
		bathrooms: DEFAULT_BATHROOMS,
		parking: DEFAULT_PARKING,
		priceMin: DEFAULT_MIN_PRICE,
		priceMax: DEFAULT_MAX_PRICE,
		features: [],
		searchRadius: DEFAULT_SEARCH_RADIUS,
		isPremium: false,
		contactEmail: user?.emailAddresses[0]?.emailAddress || "",
		contactPhone: "",
	});

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;

		// Validation
		if (formData.priceMin >= formData.priceMax) {
			setError("Maximum price must be greater than minimum price.");
			return;
		}

		if (!formData.buildingType) {
			setError("Please select a building type.");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const listingData = {
				listingType: "buyer" as const,
				suburb: formData.suburb,
				state: formData.state,
				postcode: formData.postcode,
				address: formData.address,
				latitude: formData.latitude,
				longitude: formData.longitude,
				geohash: ngeohash.encode(formData.latitude, formData.longitude, 7),
				buildingType: formData.buildingType as BuildingType,
				bedrooms: formData.bedrooms,
				bathrooms: formData.bathrooms,
				parking: formData.parking,
				priceMin: formData.priceMin,
				priceMax: formData.priceMax,
				features: formData.features,
				buyerType: formData.buyerType,
				searchRadius:
					formData.buyerType === "street" ? formData.searchRadius : undefined,
				headline: formData.headline,
				description: formData.description,
				contactEmail: formData.contactEmail || undefined,
				contactPhone: formData.contactPhone || undefined,
				isActive: true,
				isPremium: formData.isPremium,
			};

			const listingId = await createListing({ listing: listingData });
			onSuccess?.(listingId);
		} catch (error) {
			console.error("Failed to create buyer listing:", error);
			setError("Failed to create listing. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const updateFormData = (updates: Partial<BuyerFormData>) => {
		setFormData((prev) => ({ ...prev, ...updates }));
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Buyer Type */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Search className="w-5 h-5" />
						Buyer Preferences
					</CardTitle>
				</CardHeader>
				<CardContent>
					<BuyerTypeFields
						buyerType={formData.buyerType}
						onBuyerTypeChange={(value) => updateFormData({ buyerType: value })}
						searchRadius={formData.searchRadius}
						onSearchRadiusChange={(value) =>
							updateFormData({ searchRadius: value })
						}
					/>
				</CardContent>
			</Card>

			{/* Basic Details */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="w-5 h-5" />
						Listing Details
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="headline">Headline</Label>
						<Input
							id="headline"
							value={formData.headline}
							onChange={(e) => updateFormData({ headline: e.target.value })}
							placeholder="e.g., Looking for family home in quiet street"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => updateFormData({ description: e.target.value })}
							placeholder="Describe what you're looking for..."
							rows={4}
							required
						/>
					</div>
				</CardContent>
			</Card>

			{/* Location */}
			<LocationFields
				suburb={formData.suburb}
				state={formData.state}
				postcode={formData.postcode}
				address={formData.address}
				onLocationChange={(location) => updateFormData(location)}
				showStreetField={formData.buyerType === "street"}
				addressLabel="Street Address"
				addressPlaceholder="e.g., 123 Main Street"
			/>

			{/* Property Details */}
			<PropertyDetailsFields
				buildingType={formData.buildingType}
				bedrooms={formData.bedrooms}
				bathrooms={formData.bathrooms}
				parking={formData.parking}
				onPropertyChange={(property) => updateFormData(property)}
			/>

			{/* Price Range */}
			<PriceFields
				priceMin={formData.priceMin}
				priceMax={formData.priceMax}
				onPriceChange={(price) => updateFormData(price)}
				title="Budget Range"
			/>

			{/* Features */}
			<FeaturesFields
				features={formData.features}
				onFeaturesChange={(features) => updateFormData({ features })}
				listingType="buyer"
			/>

			{/* Contact Information */}
			<Card>
				<CardHeader>
					<CardTitle>Contact Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="contactEmail">Email</Label>
						<Input
							id="contactEmail"
							type="email"
							value={formData.contactEmail}
							onChange={(e) => updateFormData({ contactEmail: e.target.value })}
							placeholder="your@email.com"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="contactPhone">Phone</Label>
						<Input
							id="contactPhone"
							type="tel"
							value={formData.contactPhone}
							onChange={(e) => updateFormData({ contactPhone: e.target.value })}
							placeholder="0400 000 000"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Premium Options */}
			<Card>
				<CardHeader>
					<CardTitle>Premium Options</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center space-x-2">
						<Switch
							id="isPremium"
							checked={formData.isPremium}
							onCheckedChange={(checked) =>
								updateFormData({ isPremium: checked })
							}
						/>
						<Label htmlFor="isPremium">
							Premium Listing (Featured placement)
						</Label>
					</div>
				</CardContent>
			</Card>

			{/* Actions */}
			<div className="flex gap-4 justify-end">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isLoading}>
					{isLoading ? "Creating..." : "Create Buyer Listing"}
				</Button>
			</div>
		</form>
	);
};
