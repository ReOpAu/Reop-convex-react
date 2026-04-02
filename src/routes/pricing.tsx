import { createFileRoute } from "@tanstack/react-router";
import IntegratedPricing from "../../app/routes/pricing";

export const Route = createFileRoute("/pricing")({
	head: () => ({
		meta: [
			{ title: "Pricing - REOP Main" },
			{
				name: "description",
				content:
					"Simple, transparent pricing for REOP Main. Choose the plan that fits your real estate needs.",
			},
		],
	}),
	component: IntegratedPricing as any,
});
