import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Suggestion } from "~/stores/types";
import { classifyIntent } from "~/utils/addressFinderUtils";
import { AddressInput } from "./AddressInput";

// Highlight matching text in suggestions
const renderHighlightedText = (
	text: string,
	searchTerm: string,
): React.ReactNode => {
	if (!searchTerm.trim()) return text;

	const regex = new RegExp(
		`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
		"gi",
	);
	const parts = text.split(regex);

	return parts.map((part) =>
		regex.test(part) ? (
			<mark key={part} className="bg-yellow-100/60 text-gray-900 rounded-sm">
				{part}
			</mark>
		) : (
			part
		),
	);
};

interface ManualSearchFormProps {
	onSelect: (suggestion: Suggestion) => void;
	disabled?: boolean;
	onTyping?: (query: string) => void;
	onAutocompleteStateChange?: (state: ManualAutocompleteState) => void;
}

export interface ManualAutocompleteState {
	query: string;
	suggestions: Suggestion[];
	isLoading: boolean;
	error: string | null;
}

export const ManualSearchForm: React.FC<ManualSearchFormProps> = React.memo(
	({ onSelect, disabled = false, onTyping, onAutocompleteStateChange }) => {
		const [inputValue, setInputValue] = useState("");
		const [selectedIndex, setSelectedIndex] = useState(-1);
		const [showSuggestions, setShowSuggestions] = useState(false);
		const [isAddressSelected, setIsAddressSelected] = useState(false);
		const [hasMinimumChars, setHasMinimumChars] = useState(false);
		const [internalQuery, setInternalQuery] = useState("");
		const containerRef = useRef<HTMLDivElement>(null);
		const inputRef = useRef<HTMLInputElement>(null);
		const isUserTypingRef = useRef(false);
		const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

		// Google's recommended minimum character threshold
		const MIN_SEARCH_CHARS = 3;

		// Session token for Google's autocomplete billing optimization
		const sessionTokenRef = useRef<string | null>(null);

		// Generate session token following Google's best practices
		const getSessionToken = useCallback(() => {
			if (!sessionTokenRef.current) {
				sessionTokenRef.current = crypto.randomUUID();
			}
			return sessionTokenRef.current;
		}, []);

		// Clear session token when user selects a result (session complete)
		const clearSessionToken = useCallback(() => {
			if (sessionTokenRef.current) {
				sessionTokenRef.current = null;
			}
		}, []);

		// ManualSearchForm's own autocomplete query - completely independent
		const getPlaceSuggestionsAction = useAction(
			api.address.getPlaceSuggestions.getPlaceSuggestions,
		);

		const {
			data: autocompleteSuggestions = [],
			isLoading,
			isError,
			error,
		} = useQuery({
			queryKey: ["manualAutocomplete", internalQuery],
			queryFn: async () => {
				if (!internalQuery || internalQuery.trim().length < MIN_SEARCH_CHARS) {
					return [];
				}

				const classifiedIntent = classifyIntent(internalQuery) ?? "";
				const allowedIntents = [
					"address",
					"suburb",
					"street",
					"general",
				] as const;
				type AllowedIntent = (typeof allowedIntents)[number];

				function isAllowedIntent(intent: string): intent is AllowedIntent {
					return allowedIntents.includes(intent as AllowedIntent);
				}

				const safeIntent: AllowedIntent = isAllowedIntent(classifiedIntent)
					? classifiedIntent
					: "general";
				const result = await getPlaceSuggestionsAction({
					query: internalQuery,
					intent: safeIntent,
					isAutocomplete: true, // This is autocomplete mode
					sessionToken: getSessionToken(),
				});

				if (result.success) {
					return result.suggestions || [];
				}

				throw new Error(result.error || "Address search failed");
			},
			enabled:
				!!internalQuery && internalQuery.trim().length >= MIN_SEARCH_CHARS,
			staleTime: 5 * 60 * 1000,
			retry: 1,
		});

		useEffect(() => {
			if (!onAutocompleteStateChange) return;

			const shouldClearState =
				isAddressSelected || inputValue.trim().length < MIN_SEARCH_CHARS;

			onAutocompleteStateChange({
				query: inputValue,
				suggestions: shouldClearState ? [] : autocompleteSuggestions,
				isLoading: shouldClearState ? false : isLoading,
				error:
					shouldClearState || !isError
						? null
						: error instanceof Error
							? error.message
							: "Failed to load suggestions",
			});
		}, [
			autocompleteSuggestions,
			error,
			inputValue,
			isAddressSelected,
			isError,
			isLoading,
			onAutocompleteStateChange,
		]);

		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (
					containerRef.current &&
					!containerRef.current.contains(event.target as Node)
				) {
					setShowSuggestions(false);
				}
			};
			document.addEventListener("mousedown", handleClickOutside);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
			};
		}, []);

		const handleInputChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const query = e.target.value;

				const trimmedNewValue = query.trim();
				const meetsMinimum = trimmedNewValue.length >= MIN_SEARCH_CHARS;

				isUserTypingRef.current = true;
				setInputValue(query);
				setSelectedIndex(-1);
				setHasMinimumChars(meetsMinimum);
				setIsAddressSelected(false);

				// Sync typing with global Brain state for intent updates
				onTyping?.(query);

				// Debounced internal query update for autocomplete
				if (debounceTimerRef.current) {
					clearTimeout(debounceTimerRef.current);
				}
				debounceTimerRef.current = setTimeout(() => {
					if (meetsMinimum) {
						setInternalQuery(query);
						setShowSuggestions(true);
					} else {
						setInternalQuery("");
						setShowSuggestions(false);
					}
				}, 300);
			},
			[onTyping],
		);

		const handleSelect = useCallback(
			(suggestion: Suggestion) => {
				onSelect(suggestion);
				setInputValue(suggestion.description);
				setShowSuggestions(false);
				setSelectedIndex(-1);
				setIsAddressSelected(true);
				setInternalQuery(""); // Clear autocomplete query
				clearSessionToken(); // Complete the session
				isUserTypingRef.current = false;
			},
			[onSelect, clearSessionToken],
		);

		const handleSubmit = useCallback(
			(e: React.FormEvent) => {
				e.preventDefault();
				if (inputValue.trim()) {
					// If user submits without selecting, trigger search in parent
					setInternalQuery(inputValue.trim());
					setShowSuggestions(false);
				}
			},
			[inputValue],
		);

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent) => {
				if (showSuggestions && autocompleteSuggestions.length > 0) {
					switch (e.key) {
						case "ArrowDown":
							e.preventDefault();
							setSelectedIndex((prev) =>
								prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev,
							);
							break;
						case "ArrowUp":
							e.preventDefault();
							setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
							break;
						case "Enter":
							e.preventDefault();
							if (selectedIndex >= 0) {
								handleSelect(autocompleteSuggestions[selectedIndex]);
							} else {
								handleSubmit(e);
							}
							break;
						case "Escape":
							setShowSuggestions(false);
							setSelectedIndex(-1);
							break;
					}
				}
			},
			[
				showSuggestions,
				autocompleteSuggestions,
				selectedIndex,
				handleSelect,
				handleSubmit,
			],
		);

		const handleClearInput = useCallback(() => {
			setInputValue("");
			setInternalQuery("");
			setIsAddressSelected(false);
			setShowSuggestions(false);
			setSelectedIndex(-1);
			clearSessionToken();
			isUserTypingRef.current = false;
			// Keep focus on input after clearing
			setTimeout(() => {
				inputRef.current?.focus();
			}, 0);
		}, [clearSessionToken]);

		const handleFocus = useCallback(() => {
			// Only show suggestions if we have meaningful input and haven't selected yet
			if (
				inputValue.trim().length >= MIN_SEARCH_CHARS &&
				!isAddressSelected &&
				autocompleteSuggestions.length > 0
			) {
				setShowSuggestions(true);
			}
		}, [inputValue, isAddressSelected, autocompleteSuggestions.length]);

		const handleBlur = useCallback(() => {
			// Use setTimeout to prevent premature closing when clicking on suggestions
			setTimeout(() => {
				setShowSuggestions(false);
			}, 200);
		}, []);

		return (
			<div className="relative" ref={containerRef}>
				<AddressInput
					ref={inputRef}
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onClear={handleClearInput}
					isLoading={isLoading}
					disabled={disabled}
					aria-expanded={showSuggestions}
					aria-haspopup="listbox"
					aria-autocomplete="list"
					role="combobox"
					aria-activedescendant={
						selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined
					}
				/>

				{/* Helpful hint when user hasn't typed enough characters */}
				{inputValue.trim().length > 0 && !hasMinimumChars && !isLoading && (
					<div className="absolute z-10 w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-md text-sm text-muted-foreground shadow-sm">
						Type at least {MIN_SEARCH_CHARS} characters to see suggestions
					</div>
				)}

				{/* Error state */}
				{isError && (
					<div className="absolute z-10 w-full mt-1 px-3 py-2 bg-white border border-red-100 rounded-md text-sm text-red-600 shadow-sm">
						{error instanceof Error
							? error.message
							: "Failed to load suggestions"}
					</div>
				)}

				<AnimatePresence>
					{showSuggestions &&
						autocompleteSuggestions.length > 0 &&
						hasMinimumChars && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.1 }}
								className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
								aria-label="Address suggestions"
							>
								<AnimatePresence mode="wait">
									<motion.div
										key={autocompleteSuggestions
											.map((s: Suggestion) => s.placeId)
											.join(",")}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.1 }}
									>
										<ul>
											{autocompleteSuggestions.map((suggestion, index) => (
												<li
													key={suggestion.placeId}
													className={`px-3 py-2.5 cursor-pointer transition-colors duration-75 border-b border-gray-50 last:border-b-0 ${
														index === selectedIndex
															? "bg-accent"
															: "hover:bg-accent/50"
													} ${index === 0 ? "rounded-t-lg" : ""} ${index === autocompleteSuggestions.length - 1 ? "rounded-b-lg" : ""}`}
													onClick={() => handleSelect(suggestion)}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ")
															handleSelect(suggestion);
													}}
													onMouseDown={(e) => e.preventDefault()}
													aria-selected={index === selectedIndex}
													id={`suggestion-${index}`}
												>
													<div className="flex items-center justify-between">
														<div className="flex-1">
															<div className="text-sm text-gray-900">
																{renderHighlightedText(
																	suggestion.description,
																	inputValue.trim(),
																)}
															</div>
															{suggestion.suburb && (
																<div className="text-xs text-muted-foreground mt-0.5">
																	{renderHighlightedText(
																		suggestion.suburb,
																		inputValue.trim(),
																	)}
																</div>
															)}
														</div>
														{suggestion.resultType && (
															<span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
																{suggestion.resultType}
															</span>
														)}
													</div>
												</li>
											))}
										</ul>
									</motion.div>
								</AnimatePresence>
							</motion.div>
						)}
				</AnimatePresence>
			</div>
		);
	},
);

ManualSearchForm.displayName = "ManualSearchForm";
