import { api } from "@/convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { useUser } from "@clerk/tanstack-react-start";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { ArrowLeft, Building2, Home, Plus, X } from "lucide-react";
import ngeohash from "ngeohash";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import {
	type ListingFormData,
	listingFormSchema,
} from "~/lib/validators/listings";

const BUILDING_TYPES = [
	"House",
	"Apartment",
	"Townhouse",
	"Villa",
	"Unit",
	"Duplex",
	"Studio",
	"Land",
	"Other",
];

const AUSTRALIAN_STATES = [
	{ value: "NSW", label: "New South Wales" },
	{ value: "VIC", label: "Victoria" },
	{ value: "QLD", label: "Queensland" },
	{ value: "WA", label: "Western Australia" },
	{ value: "SA", label: "South Australia" },
	{ value: "TAS", label: "Tasmania" },
	{ value: "ACT", label: "Australian Capital Territory" },
	{ value: "NT", label: "Northern Territory" },
];

const COMMON_FEATURES = [
	"Pool",
	"Garden",
	"Garage",
	"Carport",
	"Air Conditioning",
	"Heating",
	"Fireplace",
	"Balcony",
	"Deck",
	"Shed",
	"Study",
	"Walk-in Wardrobe",
	"Ensuite",
	"Dishwasher",
	"Solar Panels",
	"Security System",
	"Intercom",
	"Gym",
];

const PRICE_OPTIONS = [
	{ value: 100000, label: "$100,000" },
	{ value: 200000, label: "$200,000" },
	{ value: 300000, label: "$300,000" },
	{ value: 400000, label: "$400,000" },
	{ value: 500000, label: "$500,000" },
	{ value: 600000, label: "$600,000" },
	{ value: 700000, label: "$700,000" },
	{ value: 800000, label: "$800,000" },
	{ value: 900000, label: "$900,000" },
	{ value: 1000000, label: "$1,000,000" },
	{ value: 1250000, label: "$1,250,000" },
	{ value: 1500000, label: "$1,500,000" },
	{ value: 2000000, label: "$2,000,000" },
	{ value: 3000000, label: "$3,000,000" },
	{ value: 5000000, label: "$5,000,000" },
];

export function CreateListingFormComponent() {
	const { user } = useUser();
	const createListing = useMutation(api.listings.createListing);
	const [newFeature, setNewFeature] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<ListingFormData>({
		resolver: zodResolver(listingFormSchema),
		defaultValues: {
			listingType: "buyer",
			subtype: "suburb",
			headline: "",
			description: "",
			suburb: "",
			state: undefined,
			postcode: "",
			street: "",
			buildingType: "",
			propertyDetails: {
				bedrooms: 0,
				bathrooms: 0,
				parkingSpaces: 0,
				landArea: undefined,
				floorArea: undefined,
			},
			price: { min: 400000, max: 800000 },
			pricePreference: { min: 400000, max: 800000 },
			mustHaveFeatures: [],
			niceToHaveFeatures: [],
			features: [],
			radiusKm: 5,
			isPremium: false,
			latitude: 0,
			longitude: 0,
		},
	});

	const watchedListingType = form.watch("listingType");
	const watchedSubtype = form.watch("subtype");

	const addFeature = (
		type: "mustHaveFeatures" | "niceToHaveFeatures" | "features",
	) => {
		if (!newFeature.trim()) return;

		const currentFeatures = form.getValues(type) || [];
		if (!currentFeatures.includes(newFeature.trim())) {
			form.setValue(type, [...currentFeatures, newFeature.trim()]);
		}
		setNewFeature("");
	};

	const removeFeature = (
		type: "mustHaveFeatures" | "niceToHaveFeatures" | "features",
		index: number,
	) => {
		const currentFeatures = form.getValues(type) || [];
		form.setValue(
			type,
			currentFeatures.filter((_, i) => i !== index),
		);
	};

	const addCommonFeature = (
		feature: string,
		type: "mustHaveFeatures" | "niceToHaveFeatures" | "features",
	) => {
		const currentFeatures = form.getValues(type) || [];
		if (!currentFeatures.includes(feature)) {
			form.setValue(type, [...currentFeatures, feature]);
		}
	};

	async function onSubmit(values: ListingFormData) {
		if (!user) return;

		setIsLoading(true);
		try {
			const now = Date.now();
			const listingData = {
				...values,
				geohash: ngeohash.encode(
					values.latitude ?? 0,
					values.longitude ?? 0,
					7,
				),
				createdAt: now,
				updatedAt: now,
				// Ensure proper price structure based on listing type
				...(values.listingType === "seller"
					? { price: values.price, pricePreference: undefined }
					: { pricePreference: values.pricePreference, price: undefined }),
			};

			const listingId = await createListing({ listing: listingData as any });
			window.location.assign(`/listings/my-listings?created=${listingId}`);
		} catch (error) {
			console.error("Failed to create listing:", error);
			form.setError("root", {
				type: "server",
				message: "Failed to create listing. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<>
			{/* Header */}
			<div className="flex items-center gap-4 mb-8">
				<Button variant="ghost" asChild>
					<Link to="/listings">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Listings
					</Link>
				</Button>
			</div>

			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl flex items-center gap-3">
					<Plus className="w-8 h-8 text-blue-600" />
					Create New Listing
				</h1>
				<p className="mt-4 text-lg text-gray-600">
					Create a buyer or seller listing to connect with property matches in
					your area.
				</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					{/* Basic Listing Info */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Home className="w-5 h-5" />
								Listing Details
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormField
									control={form.control}
									name="listingType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>I am a</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select type" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="buyer">Buyer</SelectItem>
													<SelectItem value="seller">Seller</SelectItem>
												</SelectContent>
											</Select>
											<input
												type="hidden"
												name="listingType"
												value={field.value}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="subtype"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Looking for</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select area type" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="street">
														Specific Street
													</SelectItem>
													<SelectItem value="suburb">
														Anywhere in Suburb
													</SelectItem>
												</SelectContent>
											</Select>
											<input type="hidden" name="subtype" value={field.value} />
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="headline"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Headline</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g., Family home in quiet street"
												{...field}
											/>
										</FormControl>
										<FormDescription>
											A compelling headline for your listing (5-100 characters)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Describe what you're looking for or selling..."
												rows={4}
												{...field}
											/>
										</FormControl>
										<FormDescription>
											Detailed description of your requirements or property
											(20-1000 characters)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>

					{/* Location */}
					<Card>
						<CardHeader>
							<CardTitle>Location</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<FormField
									control={form.control}
									name="suburb"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Suburb</FormLabel>
											<FormControl>
												<Input placeholder="e.g., Bondi" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="state"
									render={({ field }) => (
										<FormItem>
											<FormLabel>State</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select state" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{AUSTRALIAN_STATES.map((state) => (
														<SelectItem key={state.value} value={state.value}>
															{state.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<input
												type="hidden"
												name="state"
												value={field.value || ""}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="postcode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Postcode</FormLabel>
											<FormControl>
												<Input placeholder="e.g., 2026" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{watchedSubtype === "street" && (
								<FormField
									control={form.control}
									name="street"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Street (Optional)</FormLabel>
											<FormControl>
												<Input placeholder="e.g., Campbell Parade" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
						</CardContent>
					</Card>

					{/* Property Details */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Building2 className="w-5 h-5" />
								Property Details
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<FormField
								control={form.control}
								name="buildingType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Building Type</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select building type" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{BUILDING_TYPES.map((type) => (
													<SelectItem key={type} value={type}>
														{type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<input
											type="hidden"
											name="buildingType"
											value={field.value}
										/>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<FormField
									control={form.control}
									name="propertyDetails.bedrooms"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Bedrooms</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="0"
													{...field}
													onChange={(e) =>
														field.onChange(Number.parseInt(e.target.value) || 0)
													}
												/>
											</FormControl>
											<input
												type="hidden"
												name="bedrooms"
												value={field.value}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="propertyDetails.bathrooms"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Bathrooms</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="0"
													{...field}
													onChange={(e) =>
														field.onChange(Number.parseInt(e.target.value) || 0)
													}
												/>
											</FormControl>
											<input
												type="hidden"
												name="bathrooms"
												value={field.value}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="propertyDetails.parkingSpaces"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Parking Spaces</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="0"
													{...field}
													onChange={(e) =>
														field.onChange(Number.parseInt(e.target.value) || 0)
													}
												/>
											</FormControl>
											<input
												type="hidden"
												name="parkingSpaces"
												value={field.value}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormField
									control={form.control}
									name="propertyDetails.landArea"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Land Area (sqm)</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="0"
													placeholder="Optional"
													{...field}
													value={field.value || ""}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? Number.parseInt(e.target.value)
																: undefined,
														)
													}
												/>
											</FormControl>
											<input
												type="hidden"
												name="landArea"
												value={field.value || ""}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="propertyDetails.floorArea"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Floor Area (sqm)</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="0"
													placeholder="Optional"
													{...field}
													value={field.value || ""}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? Number.parseInt(e.target.value)
																: undefined,
														)
													}
												/>
											</FormControl>
											<input
												type="hidden"
												name="floorArea"
												value={field.value || ""}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Price Section */}
					<Card>
						<CardHeader>
							<CardTitle>
								{watchedListingType === "seller" ? "Asking Price" : "Budget"}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<FormField
									control={form.control}
									name={
										watchedListingType === "seller"
											? "price.min"
											: "pricePreference.min"
									}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Minimum ($)</FormLabel>
											<Select
												onValueChange={(value) =>
													field.onChange(Number.parseInt(value))
												}
												value={field.value?.toString()}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select minimum price" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{PRICE_OPTIONS.map((option) => (
														<SelectItem
															key={`min-${option.value}`}
															value={option.value.toString()}
														>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<input
												type="hidden"
												name="priceMin"
												value={field.value || ""}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name={
										watchedListingType === "seller"
											? "price.max"
											: "pricePreference.max"
									}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Maximum ($)</FormLabel>
											<Select
												onValueChange={(value) =>
													field.onChange(Number.parseInt(value))
												}
												value={field.value?.toString()}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select maximum price" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{PRICE_OPTIONS.map((option) => (
														<SelectItem
															key={`max-${option.value}`}
															value={option.value.toString()}
														>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<input
												type="hidden"
												name="priceMax"
												value={field.value || ""}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Additional Options */}
					{watchedListingType === "buyer" && watchedSubtype === "street" && (
						<Card>
							<CardHeader>
								<CardTitle>Search Options</CardTitle>
							</CardHeader>
							<CardContent>
								<FormField
									control={form.control}
									name="radiusKm"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Search Radius (km)</FormLabel>
											<Select
												onValueChange={(value) =>
													field.onChange(Number.parseInt(value))
												}
												value={field.value?.toString()}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="1">1 km</SelectItem>
													<SelectItem value="3">3 km</SelectItem>
													<SelectItem value="5">5 km</SelectItem>
													<SelectItem value="7">7 km</SelectItem>
													<SelectItem value="10">10 km</SelectItem>
												</SelectContent>
											</Select>
											<input
												type="hidden"
												name="radiusKm"
												value={field.value || ""}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>
					)}

					{/* Premium Option */}
					<Card>
						<CardHeader>
							<CardTitle>Additional Options</CardTitle>
						</CardHeader>
						<CardContent>
							<FormField
								control={form.control}
								name="isPremium"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">
												Premium Listing
											</FormLabel>
											<FormDescription>
												Get featured placement and priority visibility
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<input
											type="hidden"
											name="isPremium"
											value={field.value ? "true" : "false"}
										/>
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>

					{/* Hidden fields */}
					<input type="hidden" name="latitude" value="0" />
					<input type="hidden" name="longitude" value="0" />

					{/* Actions */}
					<div className="flex gap-4 justify-end">
						<Button type="button" variant="outline" asChild>
							<Link to="/listings">Cancel</Link>
						</Button>
						<Button type="submit">Create Listing</Button>
					</div>
				</form>
			</Form>
		</>
	);
}
