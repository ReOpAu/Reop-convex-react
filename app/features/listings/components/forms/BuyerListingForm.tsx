import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { AlertCircle, Search } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type {
	BuildingType,
	BuyerType,
	Feature,
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
import { FeaturesFields } from "./shared/FeaturesFields";
import { FormActions } from "./shared/FormActions";
import { FormSkeleton } from "./shared/FormSkeleton";
import { LocationFields } from "./shared/LocationFields";
import { PriceFields } from "./shared/PriceFields";
import { PropertyDetailsFields } from "./shared/PropertyDetailsFields";
import { useFormStatus } from "./shared/useFormStatus";
import { useListingForEdit } from "../../data/listingsService";

interface BuyerListingFormProps {
	listingId: Id<"listings">;
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
	searchRadius?: number;
	isPremium: boolean;
}

const findClosestPrice = (price: number): number => {
	const validPrices = PRICE_OPTIONS.map((opt) => opt.value);
	return validPrices.reduce((closest, current) =>
		Math.abs(current - price) < Math.abs(closest - price) ? current : closest,
	);
};

export const BuyerListingForm: React.FC<BuyerListingFormProps> = ({
	listingId,
	onSuccess,
	onCancel,
}) => {
	const listing = useListingForEdit(listingId);
	const updateListing = useMutation(api.listings.updateListing);

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
		bedrooms: 0,
		bathrooms: 0,
		parking: 0,
		priceMin: 500000,
		priceMax: 1000000,
		features: [],
		searchRadius: 5,
		isPremium: false,
	});

	const [status, dispatch] = useFormStatus();

	useEffect(() => {
		if (listing && !status.isInitialized && listing.listingType === "buyer") {
			setFormData({
				buyerType: listing.buyerType || "suburb",
				buildingType: listing.buildingType || "",
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
				searchRadius: listing.searchRadius || 5,
				isPremium: listing.isPremium || false,
			});
			dispatch({ type: "INITIALIZED" });
		}
	}, [listing, status.isInitialized, dispatch]);

	if (listing === undefined) {
		return <FormSkeleton />;
	}

	if (listing === null || listing.listingType !== "buyer") {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					Buyer listing not found or you don't have permission to edit it.
				</AlertDescription>
			</Alert>
		);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (formData.priceMin >= formData.priceMax) {
			dispatch({
				type: "SET_PRICE_ERROR",
				payload: "Maximum budget must be greater than minimum budget.",
			});
			return;
		}
		dispatch({ type: "SET_PRICE_ERROR", payload: null });
		dispatch({ type: "SUBMIT_START" });

		try {
			await updateListing({
				id: listingId,
				updates: {
					buyerType: formData.buyerType,
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
					searchRadius: formData.searchRadius,
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
					? "Maximum budget must be greater than minimum budget."
					: null,
		});
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Search className="w-5 h-5" />
						What I'm Looking For
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="buyerType">Search Type</Label>
						<Select
							key={`buyerType-${formData.buyerType}`}
							value={formData.buyerType || ""}
							onValueChange={(value: BuyerType) =>
								handleFieldChange("buyerType", value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select search type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="suburb">Anywhere in a suburb</SelectItem>
								<SelectItem value="street">On a specific street</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{formData.buyerType === "street" && (
						<div className="space-y-2">
							<Label htmlFor="searchRadius">Search Radius</Label>
							<Select
								value={formData.searchRadius?.toString() || "5"}
								onValueChange={(value) =>
									handleFieldChange("searchRadius", Number.parseInt(value))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select search radius" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1 km radius</SelectItem>
									<SelectItem value="3">3 km radius</SelectItem>
									<SelectItem value="5">5 km radius</SelectItem>
									<SelectItem value="7">7 km radius</SelectItem>
									<SelectItem value="10">10 km radius</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="headline">Headline</Label>
						<Input
							id="headline"
							value={formData.headline}
							onChange={(e) => handleFieldChange("headline", e.target.value)}
							placeholder="e.g., Looking for a family home in Bondi"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => handleFieldChange("description", e.target.value)}
							placeholder="Describe what you're looking for in detail..."
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
				showStreetField={formData.buyerType === "street"}
				addressLabel="Street Address"
				addressPlaceholder="e.g., 123 Main Street"
				onLocationChange={(location) =>
					setFormData((prev) => ({ ...prev, ...location }))
				}
			/>

			<PropertyDetailsFields
				buildingType={formData.buildingType}
				bedrooms={formData.bedrooms}
				bathrooms={formData.bathrooms}
				parking={formData.parking}
				title="Property Requirements"
				bedroomsLabel="Minimum Bedrooms"
				bathroomsLabel="Minimum Bathrooms"
				parkingLabel="Minimum Parking"
				onPropertyChange={(property) =>
					setFormData((prev) => ({ ...prev, ...property }))
				}
			/>

			<PriceFields
				priceMin={formData.priceMin}
				priceMax={formData.priceMax}
				title="Budget"
				minLabel="Minimum Budget"
				maxLabel="Maximum Budget"
				error={status.priceError}
				onPriceChange={handlePriceChange}
			/>

			<FeaturesFields
				features={formData.features}
				title="Desired Features"
				description="What features would you like the property to have?"
				onFeaturesChange={(features) =>
					setFormData((prev) => ({ ...prev, features }))
				}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Additional Options</CardTitle>
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
				submitLabel="Update Buyer Listing"
				onCancel={onCancel}
			/>
		</form>
	);
};
