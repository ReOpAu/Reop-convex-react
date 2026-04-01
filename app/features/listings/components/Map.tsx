import mapboxgl from "mapbox-gl";
import ngeohash from "ngeohash";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Listing } from "../types";

// Add mapbox CSS
import "mapbox-gl/dist/mapbox-gl.css";

interface ListingDetail {
	id: string;
	geohash: string;
	address: string;
	buildingType: string;
	street: string;
	suburb: string;
	lat: number;
	lng: number;
}

interface MapProps {
	location?: {
		latitude: number;
		longitude: number;
	};
	zoom?: number;
	interactive?: boolean;
	highlightStreet?: boolean;
	geohash?: string;
	listings?: Listing[];
	className?: string;
}

const EMPTY_LISTINGS: Listing[] = [];

// Helper function to convert our location format to MapBox format
const toMapboxCoords = (location: { latitude: number; longitude: number }): [
	number,
	number,
] => {
	return [location.longitude, location.latitude];
};

// Helper function to create a geohash polygon
const createGeohashPolygon = (hash: string) => {
	const bounds = ngeohash.decode_bbox(hash);
	return {
		type: "Feature" as const,
		properties: {},
		geometry: {
			type: "Polygon" as const,
			coordinates: [
				[
					[bounds[1], bounds[0]], // sw
					[bounds[3], bounds[0]], // se
					[bounds[3], bounds[2]], // ne
					[bounds[1], bounds[2]], // nw
					[bounds[1], bounds[0]], // back to sw to close the polygon
				],
			],
		},
	};
};

// Helper function to create listing markers GeoJSON
const createListingPoints = (listings: Listing[]) => {
	return {
		type: "FeatureCollection" as const,
		features: listings
			.filter(
				(
					listing,
				): listing is Listing & { latitude: number; longitude: number } =>
					typeof listing.latitude === "number" &&
					typeof listing.longitude === "number",
			)
			.map((listing) => ({
				type: "Feature" as const,
				properties: {
					id: listing._id,
					address: `${listing.address || ""}, ${listing.suburb}`,
					buildingType: listing.buildingType,
					headline: listing.headline,
				},
				geometry: {
					type: "Point" as const,
					coordinates: [listing.longitude, listing.latitude],
				},
			})),
	};
};

export const Map: React.FC<MapProps> = ({
	location,
	zoom = 15,
	interactive = false,
	highlightStreet = true,
	geohash,
	listings = EMPTY_LISTINGS,
	className = "w-full h-full rounded-lg shadow-md",
}) => {
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const observerRef = useRef<IntersectionObserver | null>(null);

	// Setup intersection observer
	useEffect(() => {
		if (!mapContainer.current) return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					setIsVisible(entry.isIntersecting);
				});
			},
			{ rootMargin: "50px" },
		);

		observerRef.current.observe(mapContainer.current);

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, []);

	// Initialize map when visible
	useEffect(() => {
		if (!isVisible || !mapContainer.current || map.current || !location) return;

		// Set Mapbox access token
		const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
		if (!mapboxToken) {
			console.error(
				"VITE_MAPBOX_ACCESS_TOKEN is not set in environment variables",
			);
			return;
		}
		mapboxgl.accessToken = mapboxToken;

		map.current = new mapboxgl.Map({
			container: mapContainer.current,
			style: "mapbox://styles/mapbox/light-v11",
			center: toMapboxCoords(location),
			zoom: zoom,
			interactive: interactive,
			attributionControl: false,
			preserveDrawingBuffer: false,
		});

		map.current.on("load", () => {
			if (!map.current || !location) return;

			// Add geohash boundary if provided
			if (geohash) {
				map.current.addSource("geohash-boundary", {
					type: "geojson",
					data: createGeohashPolygon(geohash),
				});

				// Add boundary fill
				map.current.addLayer({
					id: "geohash-boundary-fill",
					type: "fill",
					source: "geohash-boundary",
					paint: {
						"fill-color": "#4338ca",
						"fill-opacity": 0.05,
					},
				});

				// Add boundary line
				map.current.addLayer({
					id: "geohash-boundary-line",
					type: "line",
					source: "geohash-boundary",
					paint: {
						"line-color": "#4338ca",
						"line-width": 2,
						"line-opacity": 0.8,
					},
				});
			}

			// Add listing markers if provided
			if (listings.length > 0) {
				const points = createListingPoints(listings);

				map.current.addSource("listings", {
					type: "geojson",
					data: points,
				});

				// Add listing markers
				map.current.addLayer({
					id: "listings-circle",
					type: "circle",
					source: "listings",
					paint: {
						"circle-radius": 6,
						"circle-color": "#ef4444",
						"circle-stroke-width": 2,
						"circle-stroke-color": "#ffffff",
					},
				});

				// Add click handler for listing markers
				map.current.on("click", "listings-circle", (e) => {
					if (e.features && e.features[0]) {
						const feature = e.features[0];
						const properties = feature.properties;

						if (properties) {
							new mapboxgl.Popup()
								.setLngLat(e.lngLat)
								.setHTML(`
									<div class="p-2">
										<h3 class="font-bold">${properties.headline || "Listing"}</h3>
										<p class="text-sm">${properties.address || "No address"}</p>
										<p class="text-xs text-gray-600">${properties.buildingType || "Unknown type"}</p>
									</div>
								`)
								.addTo(map.current!);
						}
					}
				});

				// Change cursor on hover
				map.current.on("mouseenter", "listings-circle", () => {
					if (map.current) {
						map.current.getCanvas().style.cursor = "pointer";
					}
				});

				map.current.on("mouseleave", "listings-circle", () => {
					if (map.current) {
						map.current.getCanvas().style.cursor = "";
					}
				});
			}

			// Fit bounds to include geohash and all listings
			if (geohash) {
				const bounds = ngeohash.decode_bbox(geohash);
				const mapBounds = new mapboxgl.LngLatBounds(
					[bounds[1], bounds[0]], // sw
					[bounds[3], bounds[2]], // ne
				);
				map.current.fitBounds(mapBounds, { padding: 20 });
			}
		});

		return () => {
			if (map.current) {
				map.current.remove();
				map.current = null;
			}
		};
	}, [
		isVisible,
		location,
		zoom,
		interactive,
		highlightStreet,
		geohash,
		listings,
	]);

	if (!location) {
		return (
			<div
				className={`${className} bg-gray-100 flex items-center justify-center text-gray-500`}
			>
				No location data
			</div>
		);
	}

	return (
		<div
			ref={mapContainer}
			className={className}
			style={{
				background: !isVisible ? "#f0f0f0" : undefined,
				cursor: interactive ? "grab" : "default",
				minHeight: "200px",
			}}
		/>
	);
};
