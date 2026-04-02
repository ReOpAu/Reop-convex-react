import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import type React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardFooter } from "../../../components/ui/card";

export interface ListingsErrorBoundaryProps {
	/** Main heading for the error state */
	title?: string;
	/** Descriptive message explaining what went wrong */
	description?: string;
	/** Callback for the retry action. If not provided, reloads the page. */
	onRetry?: () => void;
	/** Whether to show the "Back to Listings" link. Defaults to true. */
	showBackLink?: boolean;
}

/**
 * A clean error state component for listings pages.
 * Provides an AlertTriangle icon, heading, description,
 * a "Try again" button, and an optional "Back to Listings" link.
 */
export const ListingsErrorBoundary: React.FC<ListingsErrorBoundaryProps> = ({
	title = "Something went wrong",
	description = "We couldn't load the requested content. This might be a temporary issue.",
	onRetry,
	showBackLink = true,
}) => {
	const handleRetry = () => {
		if (onRetry) {
			onRetry();
		} else {
			window.location.reload();
		}
	};

	return (
		<div className="container mx-auto py-12">
			<Card className="max-w-lg mx-auto border-gray-200">
				<CardContent className="pt-8 pb-4 text-center">
					<div className="flex justify-center mb-4">
						<div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
							<AlertTriangle className="h-6 w-6 text-amber-500" />
						</div>
					</div>
					<h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
					<p className="text-sm text-gray-600 leading-relaxed">{description}</p>
				</CardContent>
				<CardFooter className="flex flex-col gap-3 pb-8">
					<Button variant="default" onClick={handleRetry} className="w-full">
						<RefreshCw className="w-4 h-4 mr-2" />
						Try again
					</Button>
					{showBackLink && (
						<Button variant="ghost" asChild className="w-full">
							<Link to="/listings">
								<ArrowLeft className="w-4 h-4 mr-2" />
								Back to Listings
							</Link>
						</Button>
					)}
				</CardFooter>
			</Card>
		</div>
	);
};
