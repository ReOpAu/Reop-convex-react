import { createFileRoute } from "@tanstack/react-router";
import SignInPage from "../../app/routes/sign-in";

export const Route = createFileRoute("/sign-in")({
	component: SignInPage as any,
});
