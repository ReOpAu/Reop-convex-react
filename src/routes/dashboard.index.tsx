import { createFileRoute } from "@tanstack/react-router";
import DashboardHome from "../../app/routes/dashboard/index";

export const Route = createFileRoute("/dashboard/")({
	component: DashboardHome as any,
});
