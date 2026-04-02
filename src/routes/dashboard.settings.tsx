import { createFileRoute } from "@tanstack/react-router";
import DashboardSettings from "../../app/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings")({
	component: DashboardSettings as any,
});
