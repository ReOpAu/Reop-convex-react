/**
 * Capitalizes the first letter of a string
 */
export const capitalize = (str: string | undefined): string => {
	if (!str) return "";
	return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Converts kebab-case to Title Case
 * Example: "my-suburb-name" -> "My Suburb Name"
 */
export const kebabToTitleCase = (str: string | undefined): string => {
	if (!str) return "";
	return str
		.replace(/-/g, " ")
		.split(" ")
		.map((word) => capitalize(word))
		.join(" ");
};

/**
 * Formats listing type for display
 */
export const formatListingType = (type: string | undefined): string => {
	if (!type) return "";
	return capitalize(type);
};

/**
 * Formats state abbreviation to uppercase
 */
export const formatStateAbbr = (state: string | undefined): string => {
	if (!state) return "";
	return state.toUpperCase();
};
