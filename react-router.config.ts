import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

const presets = process.env.VERCEL === "1" ? [vercelPreset()] : [];

export default {
	ssr: true,
	future: {
		v8_middleware: true,
	},
	presets,
} satisfies Config;
