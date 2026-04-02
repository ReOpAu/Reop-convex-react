import { createFileRoute } from "@tanstack/react-router";
import SubscriptionRequired from "../../app/routes/subscription-required";

export const Route = createFileRoute("/subscription-required")({
	component: SubscriptionRequired as any,
});
