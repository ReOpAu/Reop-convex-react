import { useAuth } from "@clerk/react-router";
import { ExternalLink, Loader2, Star } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../../../components/ui/tabs";

interface Place {
	name: string;
	vicinity: string;
	rating?: number;
	type: string;
	distance?: number;
	place_id: string;
}

interface TabConfig {
	id: string;
	title: string;
	types: string[];
	minRating: number;
}

interface NearbyPlacesTabsProps {
	latitude: number;
	longitude: number;
	radius?: number;
}

interface CachedData {
	places: Place[];
	error: string | null;
}

const STAR_POSITIONS = [1, 2, 3, 4, 5] as const;

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
	return (
		<div className="flex items-center gap-1">
			{STAR_POSITIONS.map((position) => (
				<Star
					key={position}
					className={`w-4 h-4 ${
						position <= Math.round(rating)
							? "text-yellow-400 fill-yellow-400"
							: "text-gray-300"
					}`}
				/>
			))}
			<span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
		</div>
	);
};

export const NearbyPlacesTabs: React.FC<NearbyPlacesTabsProps> = ({
	latitude,
	longitude,
	radius = 2000,
}) => {
	const { getToken } = useAuth();
	const [activeTab, setActiveTab] = useState("education");
	const [cachedData, setCachedData] = useState<Record<string, CachedData>>({});
	const [loading, setLoading] = useState(false);

	const tabs: TabConfig[] = [
		{
			id: "education",
			title: "Education",
			types: ["school", "primary_school", "secondary_school", "university"],
			minRating: 3,
		},
		{
			id: "health",
			title: "Health & Medical",
			types: ["doctor", "dentist", "hospital", "pharmacy", "physiotherapist"],
			minRating: 3,
		},
		{
			id: "dining",
			title: "Dining & Drinks",
			types: ["restaurant", "cafe", "bar"],
			minRating: 4,
		},
		{
			id: "gyms",
			title: "Gyms",
			types: ["gym"],
			minRating: 4,
		},
		{
			id: "arts",
			title: "Arts & Culture",
			types: ["art_gallery", "museum", "tourist_attraction"],
			minRating: 3,
		},
		{
			id: "entertainment",
			title: "Entertainment",
			types: ["movie_theater", "amusement_park", "bowling_alley"],
			minRating: 3,
		},
		{
			id: "shopping",
			title: "Shopping",
			types: [
				"shopping_mall",
				"department_store",
				"supermarket",
				"clothing_store",
			],
			minRating: 3,
		},
	];

	const formatGoogleMapsUrl = (name: string, vicinity: string) => {
		const query = encodeURIComponent(`${name} ${vicinity}`);
		return `https://www.google.com/maps/search/?api=1&query=${query}`;
	};

	const fetchTabData = useCallback(
		async (tab: TabConfig) => {
			if (cachedData[tab.id]) return; // Use cached data if available

			setLoading(true);
			try {
				const token = await getToken({ template: "convex" });
				if (!token) {
					throw new Error("Sign in is required to load nearby places.");
				}

				const convexUrl = import.meta.env.VITE_CONVEX_URL;
				// Convert .convex.cloud to .convex.site for HTTP actions
				const httpUrl = convexUrl.replace(".convex.cloud", ".convex.site");
				const response = await fetch(`${httpUrl}/api/nearbyPlaces`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						lat: latitude,
						lng: longitude,
						radius: radius,
						types: tab.types,
						minRating: tab.minRating,
					}),
				});

				if (!response.ok) {
					let errorMessage = "Failed to fetch nearby places";
					try {
						const errorData = await response.json();
						errorMessage = errorData.error || errorMessage;
					} catch (parseError) {
						// If JSON parsing fails, use the HTTP status text
						errorMessage = response.statusText || errorMessage;
					}
					throw new Error(errorMessage);
				}

				const places = await response.json();
				setCachedData((prev) => ({
					...prev,
					[tab.id]: { places, error: null },
				}));
			} catch (err) {
				console.error("Error fetching nearby places:", err);
				setCachedData((prev) => ({
					...prev,
					[tab.id]: {
						places: [],
						error: err instanceof Error ? err.message : "An error occurred",
					},
				}));
			} finally {
				setLoading(false);
			}
		},
		[getToken, latitude, longitude, radius, cachedData],
	);

	// Only fetch data when the component is mounted and a tab is active
	useEffect(() => {
		const activeTabConfig = tabs.find((tab) => tab.id === activeTab);
		if (activeTabConfig && !cachedData[activeTab]) {
			fetchTabData(activeTabConfig);
		}
	}, [activeTab, cachedData, fetchTabData]);

	return (
		<div className="w-full h-full flex flex-col">
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="flex-1 flex flex-col"
			>
				<TabsList className="grid w-full grid-cols-7">
					{tabs.map((tab) => (
						<TabsTrigger key={tab.id} value={tab.id} className="text-xs">
							{tab.title}
						</TabsTrigger>
					))}
				</TabsList>

				<div className="flex-1 overflow-hidden mt-4">
					{tabs.map((tab) => (
						<TabsContent
							key={tab.id}
							value={tab.id}
							className="h-full overflow-auto"
						>
							{loading ? (
								<div className="flex items-center justify-center p-8">
									<Loader2 className="w-8 h-8 animate-spin" />
								</div>
							) : (
								<div>
									{cachedData[activeTab]?.error ? (
										<Alert variant="destructive">
											<AlertDescription>
												{cachedData[activeTab].error}
											</AlertDescription>
										</Alert>
									) : (
										<div>
											{!cachedData[activeTab]?.places.length ? (
												<p className="text-gray-500 text-center py-8">
													No places found nearby
												</p>
											) : (
												<div className="space-y-3">
													{cachedData[activeTab].places.map((place) => (
														<Card key={place.place_id}>
															<CardContent className="p-4">
																<div className="flex justify-between items-start gap-2">
																	<div className="flex-1">
																		<h4 className="font-semibold text-base flex items-center gap-2">
																			<Button
																				variant="link"
																				className="p-0 h-auto font-semibold text-base"
																				asChild
																			>
																				<a
																					href={formatGoogleMapsUrl(
																						place.name,
																						place.vicinity,
																					)}
																					target="_blank"
																					rel="noopener noreferrer"
																					className="flex items-center gap-1"
																				>
																					{place.name}
																					<ExternalLink className="w-4 h-4" />
																				</a>
																			</Button>
																		</h4>
																	</div>
																	<Badge
																		variant="secondary"
																		className="capitalize whitespace-nowrap"
																	>
																		{place.type}
																	</Badge>
																</div>
																<p className="text-sm text-gray-600 mt-2">
																	{place.vicinity}
																</p>
																{place.distance && (
																	<p className="text-sm text-gray-600">
																		{(place.distance / 1000).toFixed(1)}km away
																	</p>
																)}
																{place.rating && (
																	<div className="mt-2">
																		<StarRating rating={place.rating} />
																	</div>
																)}
															</CardContent>
														</Card>
													))}
												</div>
											)}
										</div>
									)}
								</div>
							)}
						</TabsContent>
					))}
				</div>
			</Tabs>
		</div>
	);
};
