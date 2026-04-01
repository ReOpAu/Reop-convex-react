import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/react-router";
import { useMutation } from "convex/react";
import { AlertCircle, Building2, Home } from "lucide-react";
import ngeohash from "ngeohash";
import type React from "react";
import { useState } from "react";
import {
	type BuildingType,
	DEFAULT_BATHROOMS,
	DEFAULT_BEDROOMS,
	DEFAULT_PARKING,
	type Feature,
	type SellerType,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../../../components/ui/select";
import { Switch } from "../../../../components/ui/switch";
import { Textarea } from "../../../../components/ui/textarea";
import { FeaturesFields } from "./shared/FeaturesFields";
import { LocationFields } from "./shared/LocationFields";
import { PriceFields } from "./shared/PriceFields";
import { PropertyDetailsFields } from "./shared/PropertyDetailsFields";

interface CreateSellerListingFormProps {
	onSuccess?: (listingId: string) => void;
	onCancel?: () => void;
}

interface SellerFormData {
	sellerType: SellerType;
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
	isPremium: boolean;
	contactEmail: string;
	contactPhone: string;
}

export const CreateSellerListingForm: React.FC<
	CreateSellerListingFormProps
> = ({ onSuccess, onCancel }) => {
	const { user } = useUser();
	const createListing = useMutation(api.listings.createListing);

	const [formData, setFormData] = useState<SellerFormData>({
		sellerType: "sale",
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
				listingType: "seller" as const,
				suburb: formData.suburb,
				state: formData.state,
				postcode: formData.postcode,
				address: formData.address || undefined,
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
				sellerType: formData.sellerType,
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
			console.error("Failed to create seller listing:", error);
			setError("Failed to create listing. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const updateFormData = (updates: Partial<SellerFormData>) => {
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

			{/* Seller Type */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="w-5 h-5" />
						Seller Information
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<Label htmlFor="sellerType">Listing Type</Label>
						<Select
							value={formData.sellerType}
							onValueChange={(value: SellerType) =>
								updateFormData({ sellerType: value })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="sale">For Sale</SelectItem>
								<SelectItem value="offmarket">Off Market</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Basic Details */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="w-5 h-5" />
						Property Details
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="headline">Headline</Label>
						<Input
							id="headline"
							value={formData.headline}
							onChange={(e) => updateFormData({ headline: e.target.value })}
							placeholder="e.g., Beautiful family home with pool"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => updateFormData({ description: e.target.value })}
							placeholder="Describe your property..."
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
				showStreetField={true}
				addressLabel="Full Address"
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
				title="Asking Price Range"
			/>

			{/* Features */}
			<FeaturesFields
				features={formData.features}
				onFeaturesChange={(features) => updateFormData({ features })}
				listingType="seller"
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
					{isLoading ? "Creating..." : "Create Seller Listing"}
				</Button>
			</div>
		</form>
	);
};
