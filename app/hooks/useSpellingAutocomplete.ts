import { useEffect, useRef, useState } from "react";
import { searchAddressApi } from "~/services/address-api.client";

export interface SpellingSuggestion {
	address: string;
	confidence: number;
	matchType: string;
	placeId: string;
	addressType: string;
	sessionToken?: string;
}

interface UseSpellingAutocompleteOptions {
	location?: {
		lat: number;
		lng: number;
	};
	radius?: number;
	minLength?: number;
	debounceMs?: number;
}

export const useSpellingAutocomplete = (
	options: UseSpellingAutocompleteOptions = {},
) => {
	const {
		location,
		radius = 50000, // 50km default radius
		minLength = 2,
		debounceMs = 300,
	} = options;

	const [suggestions, setSuggestions] = useState<SpellingSuggestion[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Session token for cost optimization (persists across requests in same session)
	const sessionTokenRef = useRef<string | null>(null);

	// Generate new session token using a simple fallback
	const generateSessionToken = () => {
		// Use crypto.randomUUID if available, otherwise fallback to a simple UUID
		if (typeof globalThis.crypto?.randomUUID === "function") {
			return globalThis.crypto.randomUUID();
		}
		// Simple fallback UUID generator
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	};

	// Get or create session token
	const getSessionToken = () => {
		if (!sessionTokenRef.current) {
			sessionTokenRef.current = generateSessionToken();
		}
		return sessionTokenRef.current;
	};

	// Reset session (call this when user selects an address or abandons search)
	const resetSession = () => {
		sessionTokenRef.current = null;
	};

	const debounceTimerRef = useRef<NodeJS.Timeout>(undefined);

	const getSuggestions = async (input: string) => {
		if (input.length < minLength) {
			setSuggestions([]);
			setError(null);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const sessionToken = getSessionToken();

			const args: {
				query: string;
				intent?: "suburb" | "street" | "address" | "general";
				maxResults: number;
				sessionToken: string;
				location?: { lat: number; lng: number };
				radius?: number;
				isAutocomplete: boolean;
			} = {
				query: input,
				intent: "general",
				maxResults: 8,
				sessionToken,
				isAutocomplete: true,
			};

			// Add location biasing if provided
			if (location) {
				args.location = location;
				args.radius = radius;
			}

			const result = await searchAddressApi(args);
			// Handle the new API response format
			if (result.success && Array.isArray(result.suggestions)) {
				// Convert the new format to the expected format
				const convertedSuggestions = result.suggestions.map((suggestion) => ({
					address: suggestion.description,
					confidence: suggestion.confidence || 0.5,
					matchType: suggestion.resultType || "general",
					placeId: suggestion.placeId,
					addressType: suggestion.types?.[0] || "establishment",
					sessionToken,
				}));
				setSuggestions(convertedSuggestions);
			} else {
				console.warn("API response error:", result);
				setSuggestions([]);
			}
		} catch (err) {
			console.error("Address autocomplete error:", err);
			setError("Failed to fetch address suggestions");
			setSuggestions([]);
		} finally {
			setIsLoading(false);
		}
	};

	const debouncedGetSuggestions = (input: string) => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			getSuggestions(input);
		}, debounceMs);
	};

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	return {
		suggestions,
		isLoading,
		error,
		getSuggestions,
		debouncedGetSuggestions,
		getSessionToken,
		resetSession,
		clearSuggestions: () => setSuggestions([]),
		clearError: () => setError(null),
	};
};
