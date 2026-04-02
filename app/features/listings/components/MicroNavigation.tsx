import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import React from "react";

export interface NavigationPath {
	label: string;
	href: string;
}

export interface MicroNavigationProps {
	paths: NavigationPath[];
	className?: string;
}

export const MicroNavigation: React.FC<MicroNavigationProps> = ({
	paths,
	className = "flex items-center gap-2 text-sm text-gray-600",
}) => {
	return (
		<nav className={className}>
			<Link to="/listings" className="hover:text-gray-900 transition-colors">
				Listings
			</Link>
			{paths.map((path, index) => (
				<React.Fragment key={index}>
					<ChevronRight className="w-4 h-4 text-gray-400" />
					{index === paths.length - 1 ? (
						<span className="text-gray-900 font-medium">{path.label}</span>
					) : (
						<Link
							to={path.href}
							className="hover:text-gray-900 transition-colors"
						>
							{path.label}
						</Link>
					)}
				</React.Fragment>
			))}
		</nav>
	);
};
