import { createFileRoute } from "@tanstack/react-router";
import SignUpPage from "../../app/routes/sign-up";

export const Route = createFileRoute("/sign-up/$")({
	component: SignUpPage as any,
});
