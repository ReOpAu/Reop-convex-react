import { X } from "lucide-react";
import React from "react";
import { Input } from "~/components/ui/input";

interface AddressInputProps {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
	onFocus: () => void;
	onBlur?: () => void;
	onClear: () => void;
	isLoading: boolean;
	disabled?: boolean;
	// Accessibility attributes for autocomplete (Google best practices)
	"aria-expanded"?: boolean;
	"aria-haspopup"?: "listbox" | "menu" | "tree" | "grid" | "dialog";
	"aria-autocomplete"?: "none" | "inline" | "list" | "both";
	"aria-activedescendant"?: string;
	"aria-controls"?: string;
	role?: string;
}

export const AddressInput = React.forwardRef<
	HTMLInputElement,
	AddressInputProps
>(
	(
		{
			value,
			onChange,
			onKeyDown,
			onFocus,
			onBlur,
			onClear,
			isLoading,
			disabled = false,
			"aria-expanded": ariaExpanded,
			"aria-haspopup": ariaHaspopup,
			"aria-autocomplete": ariaAutocomplete,
			"aria-activedescendant": ariaActivedescendant,
			"aria-controls": ariaControls,
			role,
		},
		ref,
	) => {
		return (
			<div className="relative w-full">
				<Input
					ref={ref}
					placeholder="Type an address..."
					value={value}
					onChange={onChange}
					onKeyDown={onKeyDown}
					onFocus={onFocus}
					onBlur={onBlur}
					disabled={disabled}
					autoComplete="off"
					spellCheck={false}
					autoCorrect="off"
					autoCapitalize="none"
					className={`${isLoading ? "pr-16" : "pr-10"}`}
					aria-expanded={ariaExpanded}
					aria-haspopup={ariaHaspopup}
					aria-autocomplete={ariaAutocomplete}
					aria-activedescendant={ariaActivedescendant}
					aria-controls={ariaControls}
					role={role}
				/>
				{isLoading && (
					<div className="absolute right-8 top-1/2 transform -translate-y-1/2">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
					</div>
				)}
				{value && (
					<button
						type="button"
						onClick={onClear}
						className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Clear search"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		);
	},
);

AddressInput.displayName = "AddressInput";
