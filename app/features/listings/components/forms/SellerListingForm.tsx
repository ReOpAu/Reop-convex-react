import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { AlertCircle, Home } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type {
	BuildingType,
	Feature,
	SellerType,
} from "../../../../../shared/constants/listingConstants";
import { PRICE_OPTIONS } from "../../../../../shared/constants/priceOptions";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
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
import { ContactFields } from "./shared/ContactFields";
import { FeaturesFields } from "./shared/FeaturesFields";
import { FormActions } from "./shared/FormActions";
import { FormSkeleton } from "./shared/FormSkeleton";
import { LocationFields } from "./shared/LocationFields";
import { PriceFields } from "./shared/PriceFields";
import { PropertyDetailsFields } from "./shared/PropertyDetailsFields";
import { useFormStatus } from "./shared/useFormStatus";
import { useListingForEdit } from "../../data/listingsService";

interface SellerListingFormProps {
	listingId: Id<"listings">;
	onSuccess?: (listingId: string) => void;
	onCancel?: () => void;
}

interface SellerFormData {
	sellerType: SellerType;
	buildingType: BuildingType | undefined;
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
	contactEmail?: string;
	contactPhone?: string;
	isPremium: boolean;
}

const findClosestPrice = (price: number): number => {
	const validPrices = PRICE_OPTIONS.map((opt) => opt.value);
	return validPrices.reduce((closest, current) =>
		Math.abs(current - price) < Math.abs(closest - price) ? current : closest,
	);
};

export const SellerListingForm: React.FC<SellerListingFormProps> = ({
	listingId,
	onSuccess,
	onCancel,
}) => {
	const listing = useListingForEdit(listingId);
	const updateListing = useMutation(api.listings.updateListing);

	const [formData, setFormData] = useState<SellerFormData>({
		sellerType: "sale",
		buildingType: undefined,
		headline: "",
		description: "",
		suburb: "",
		state: "",
		postcode: "",
		address: "",
		latitude: 0,
		longitude: 0,
		bedrooms: 0,
		bathrooms: 0,
		parking: 0,
		priceMin: 500000,
		priceMax: 1000000,
		features: [],
		contactEmail: "",
		contactPhone: "",
		isPremium: false,
	});

	const [status, dispatch] = useFormStatus();

	useEffect(() => {
		if (listing && !status.isInitialized && listing.listingType === "seller") {
			setFormData({
				sellerType: listing.sellerType || "sale",
				buildingType: listing.buildingType || undefined,
				headline: listing.headline,
				description: listing.description,
				suburb: listing.suburb,
				state: listing.state,
				postcode: listing.postcode,
				address: listing.address || "",
				latitude: listing.latitude,
				longitude: listing.longitude,
				bedrooms: listing.bedrooms,
				bathrooms: listing.bathrooms,
				parking: listing.parking,
				priceMin: findClosestPrice(listing.priceMin),
				priceMax: findClosestPrice(listing.priceMax),
				features: listing.features || [],
				contactEmail: listing.contactEmail || "",
				contactPhone: listing.contactPhone || "",
				isPremium: listing.isPremium || false,
			});
			dispatch({ type: "INITIALIZED" });
		}
	}, [listing, status.isInitialized, dispatch]);

	if (listing === undefined) {
		return <FormSkeleton />;
	}

	if (listing === null || listing.listingType !== "seller") {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					Seller listing not found or you don't have permission to edit it.
				</AlertDescription>
			</Alert>
		);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (formData.priceMin >= formData.priceMax) {
			dispatch({
				type: "SET_PRICE_ERROR",
				payload: "Maximum price must be greater than minimum price.",
			});
			return;
		}
		dispatch({ type: "SET_PRICE_ERROR", payload: null });
		dispatch({ type: "SUBMIT_START" });

		try {
			await updateListing({
				id: listingId,
				updates: {
					sellerType: formData.sellerType,
					...(formData.buildingType && {
						buildingType: formData.buildingType,
					}),
					headline: formData.headline,
					description: formData.description,
					suburb: formData.suburb,
					state: formData.state,
					postcode: formData.postcode,
					address: formData.address,
					latitude: formData.latitude,
					longitude: formData.longitude,
					bedrooms: formData.bedrooms,
					bathrooms: formData.bathrooms,
					parking: formData.parking,
					priceMin: formData.priceMin,
					priceMax: formData.priceMax,
					features: formData.features,
					contactEmail: formData.contactEmail,
					contactPhone: formData.contactPhone,
					isPremium: formData.isPremium,
				},
			});
			dispatch({ type: "SUBMIT_SUCCESS" });
			onSuccess?.(listingId);
		} catch (err) {
			dispatch({
				type: "SUBMIT_ERROR",
				payload: "Failed to update listing. Please try again.",
			});
		}
	};

	const handleFieldChange = (field: string, value: string | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handlePriceChange = (price: {
		priceMin?: number;
		priceMax?: number;
	}) => {
		setFormData((prev) => ({ ...prev, ...price }));
		const newMin = price.priceMin ?? formData.priceMin;
		const newMax = price.priceMax ?? formData.priceMax;
		dispatch({
			type: "SET_PRICE_ERROR",
			payload:
				newMin >= newMax
					? "Maximum price must be greater than minimum price."
					: null,
		});
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="w-5 h-5" />
						Property Listing
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="sellerType">Listing Type</Label>
						<Select
							key={`sellerType-${formData.sellerType}`}
							value={formData.sellerType || ""}
							onValueChange={(value: SellerType) =>
								handleFieldChange("sellerType", value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select listing type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="sale">For Sale</SelectItem>
								<SelectItem value="offmarket">Off Market</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="headline">Listing Headline</Label>
						<Input
							id="headline"
							value={formData.headline}
							onChange={(e) => handleFieldChange("headline", e.target.value)}
							placeholder="e.g., Beautiful family home in quiet street"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Property Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => handleFieldChange("description", e.target.value)}
							placeholder="Describe your property in detail..."
							rows={4}
							required
						/>
					</div>
				</CardContent>
			</Card>

			<LocationFields
				suburb={formData.suburb}
				state={formData.state}
				postcode={formData.postcode}
				address={formData.address}
				showStreetField={true}
				addressLabel="Property Address"
				addressPlaceholder="e.g., 123 Campbell Parade"
				onLocationChange={(location) =>
					setFormData((prev) => ({ ...prev, ...location }))
				}
			/>

			<PropertyDetailsFields
				buildingType={(formData.buildingType || "") as any}
				bedrooms={formData.bedrooms}
				bathrooms={formData.bathrooms}
				parking={formData.parking}
				title="Property Specifications"
				onPropertyChange={(property) =>
					setFormData((prev) => ({ ...prev, ...property }) as any)
				}
			/>

			<PriceFields
				priceMin={formData.priceMin}
				priceMax={formData.priceMax}
				title="Asking Price"
				minLabel="Minimum Price"
				maxLabel="Maximum Price"
				error={status.priceError}
				onPriceChange={handlePriceChange}
			/>

			<FeaturesFields
				features={formData.features}
				title="Property Features"
				description="What features does your property have?"
				onFeaturesChange={(features) =>
					setFormData((prev) => ({ ...prev, features }))
				}
			/>

			<ContactFields
				contactEmail={formData.contactEmail}
				contactPhone={formData.contactPhone}
				onFieldChange={handleFieldChange}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Listing Options</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center space-x-2">
						<Switch
							id="isPremium"
							checked={formData.isPremium}
							onCheckedChange={(checked) =>
								setFormData((prev) => ({ ...prev, isPremium: checked }))
							}
						/>
						<Label htmlFor="isPremium">
							Premium Listing (Featured placement)
						</Label>
					</div>
				</CardContent>
			</Card>

			<FormActions
				error={status.error}
				isLoading={status.isLoading}
				submitLabel="Update Property Listing"
				onCancel={onCancel}
			/>
		</form>
	);
};
