import { createFileRoute } from "@tanstack/react-router";
import Success from "../../app/routes/success";

export const Route = createFileRoute("/success")({
	component: Success as any,
});
