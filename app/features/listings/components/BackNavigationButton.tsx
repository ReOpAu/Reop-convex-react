import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type React from "react";
import { Button } from "~/components/ui/button";

interface BackNavigationButtonProps {
	to: string;
	params?: Record<string, string>;
	label: string;
}

export const BackNavigationButton: React.FC<BackNavigationButtonProps> = ({
	to,
	params,
	label,
}) => {
	return (
		<Button variant="ghost" asChild>
			<Link to={to as never} params={params as never} aria-label={label}>
				<ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
				{label}
			</Link>
		</Button>
	);
};
