import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: [
			{
				find: "@clerk/react-router/api.server",
				replacement: path.resolve(
					__dirname,
					"src/compat/clerk-react-router-api-server.ts",
				),
			},
			{
				find: "@clerk/react-router/server",
				replacement: path.resolve(
					__dirname,
					"src/compat/clerk-react-router-server.ts",
				),
			},
			{
				find: "@clerk/react-router",
				replacement: path.resolve(__dirname, "src/compat/clerk-react-router.ts"),
			},
			{
				find: "react-router",
				replacement: path.resolve(__dirname, "src/compat/react-router.tsx"),
			},
			{
				find: "use-sync-external-store/shim/index.js",
				replacement: "react",
			},
		],
	},
	plugins: [tailwindcss(), tanstackStart(), tsconfigPaths(), viteReact()],
});
