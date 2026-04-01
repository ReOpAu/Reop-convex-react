import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { paymentWebhook } from "./subscriptions";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";

function getAllowedOrigin(request: Request) {
	const origin = request.headers.get("Origin");
	if (!origin) {
		return null;
	}

	const allowedOrigins = new Set(
		[process.env.FRONTEND_URL].filter(
			(value): value is string => typeof value === "string" && value.length > 0,
		),
	);

	return allowedOrigins.has(origin) ? origin : null;
}

function corsHeaders(request: Request, methods: string): Record<string, string> {
	const origin = getAllowedOrigin(request);
	if (!origin) {
		return {};
	}

	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": methods,
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Allow-Credentials": "true",
		Vary: "Origin",
	};
}

function jsonResponse(
	request: Request,
	body: Record<string, unknown> | unknown[],
	status = 200,
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...corsHeaders(request, "POST, OPTIONS"),
		},
	});
}

async function requireHttpIdentity(ctx: any) {
	try {
		const identity = await ctx.auth.getUserIdentity();
		return identity ?? null;
	} catch {
		return null;
	}
}

async function requireJsonBody(request: Request) {
	try {
		return await request.json();
	} catch {
		return null;
	}
}

function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 6371e3;
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return Math.round(R * c);
}

function getDisplayType(types: string[]): string {
	if (types.length > 0) {
		return types[0]
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}
	return "Place";
}

function parseNearbyPlacesRequest(body: any) {
	const lat = Number(body?.lat);
	const lng = Number(body?.lng);
	const radius = body?.radius === undefined ? 2000 : Number(body.radius);
	const minRating =
		body?.minRating === undefined ? undefined : Number(body.minRating);
	const types = Array.isArray(body?.types)
		? body.types.filter((type: unknown) => typeof type === "string").slice(0, 10)
		: [];

	if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
		return { error: "Latitude must be a valid number between -90 and 90." };
	}

	if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
		return {
			error: "Longitude must be a valid number between -180 and 180.",
		};
	}

	if (!Number.isFinite(radius) || radius < 100 || radius > 20_000) {
		return {
			error: "Radius must be a valid number between 100 and 20000 meters.",
		};
	}

	if (
		minRating !== undefined &&
		(!Number.isFinite(minRating) || minRating < 0 || minRating > 5)
	) {
		return { error: "Minimum rating must be between 0 and 5." };
	}

	return {
		lat,
		lng,
		radius,
		types,
		minRating,
	};
}

function validateChatMessages(messages: unknown) {
	if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
		return false;
	}

	try {
		const serialized = JSON.stringify(messages);
		return serialized.length <= 50_000;
	} catch {
		return false;
	}
}

export const nearbyPlaces = httpAction(async (ctx, request) => {
	if (!getAllowedOrigin(request) && request.headers.get("Origin")) {
		return jsonResponse(request, { error: "Origin not allowed." }, 403);
	}

	const identity = await requireHttpIdentity(ctx);
	if (!identity) {
		return jsonResponse(request, { error: "Authentication required." }, 401);
	}

	if (!GOOGLE_MAPS_API_KEY) {
		return jsonResponse(
			request,
			{ error: "Google Places API key is not configured." },
			500,
		);
	}

	const body = await requireJsonBody(request);
	if (!body) {
		return jsonResponse(request, { error: "Invalid JSON body." }, 400);
	}

	const parsed = parseNearbyPlacesRequest(body);
	if ("error" in parsed) {
		return jsonResponse(request, { error: parsed.error }, 400);
	}

	const requestBody = {
		locationRestriction: {
			circle: {
				center: {
					latitude: parsed.lat,
					longitude: parsed.lng,
				},
				radius: parsed.radius,
			},
		},
		includedTypes: parsed.types,
		maxResultCount: 20,
	};

	try {
		const response = await fetch(PLACES_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
				"X-Goog-FieldMask":
					"places.displayName,places.formattedAddress,places.rating,places.types,places.location",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			console.error("Google Places API error:", await response.text());
			return jsonResponse(
				request,
				{ error: "Failed to fetch nearby places." },
				response.status,
			);
		}

		const data = await response.json();
		const rawPlaces = Array.isArray(data?.places) ? data.places : [];

		let places = rawPlaces.map((place: any, index: number) => ({
			place_id: `place_${index}_${Math.random().toString(36).slice(2, 11)}`,
			name: place.displayName?.text,
			vicinity: place.formattedAddress,
			rating: place.rating,
			types: place.types,
			type: getDisplayType(place.types ?? []),
			distance: calculateDistance(
				parsed.lat,
				parsed.lng,
				place.location.latitude,
				place.location.longitude,
			),
		}));

		const minRating = parsed.minRating;
		if (minRating !== undefined) {
			places = places.filter(
				(place: { rating?: number }) =>
					typeof place.rating === "number" && place.rating >= minRating,
			);
		}

		places.sort(
			(a: { distance: number }, b: { distance: number }) =>
				a.distance - b.distance,
		);

		return jsonResponse(request, places);
	} catch (error) {
		console.error("Error fetching nearby places:", error);
		return jsonResponse(
			request,
			{ error: "An internal error occurred." },
			500,
		);
	}
});

export const chat = httpAction(async (ctx, request) => {
	if (!getAllowedOrigin(request) && request.headers.get("Origin")) {
		return jsonResponse(request, { error: "Origin not allowed." }, 403);
	}

	const identity = await requireHttpIdentity(ctx);
	if (!identity) {
		return jsonResponse(request, { error: "Authentication required." }, 401);
	}

	const body = await requireJsonBody(request);
	if (!body || !validateChatMessages(body.messages)) {
		return jsonResponse(request, { error: "Invalid chat request." }, 400);
	}

	const result = streamText({
		model: openai("gpt-4o"),
		messages: body.messages,
	});

	return result.toDataStreamResponse({
		headers: {
			...corsHeaders(request, "POST, OPTIONS"),
		},
	});
});

function buildPreflightHandler(methods: string) {
	return httpAction(async (_, request) => {
		const origin = getAllowedOrigin(request);
		if (!origin) {
			return new Response(null, { status: 403 });
		}

		return new Response(null, {
			headers: {
				...corsHeaders(request, methods),
				"Access-Control-Max-Age": "86400",
			},
		});
	});
}

const http = httpRouter();

http.route({
	path: "/api/chat",
	method: "POST",
	handler: chat,
});

http.route({
	path: "/api/chat",
	method: "OPTIONS",
	handler: buildPreflightHandler("POST"),
});

http.route({
	path: "/api/auth/webhook",
	method: "POST",
	handler: httpAction(async (_, request) => {
		const origin = getAllowedOrigin(request);
		if (!origin) {
			return new Response();
		}

		return new Response(null, {
			headers: {
				...corsHeaders(request, "POST"),
				"Access-Control-Max-Age": "86400",
			},
		});
	}),
});

http.route({
	path: "/payments/webhook",
	method: "POST",
	handler: paymentWebhook,
});

http.route({
	path: "/api/nearbyPlaces",
	method: "POST",
	handler: nearbyPlaces,
});

http.route({
	path: "/api/nearbyPlaces",
	method: "OPTIONS",
	handler: buildPreflightHandler("POST"),
});

export default http;
