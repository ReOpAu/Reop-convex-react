import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const distDirs = collectElevenLabsDistDirs();

const availableDistDirs = distDirs.filter((dirPath) => existsSync(dirPath));

if (availableDistDirs.length === 0) {
	console.log("[fix-elevenlabs-esm] ElevenLabs packages not installed, skipping.");
	process.exit(0);
}

let patchedFiles = 0;
let patchedImports = 0;

for (const distDir of availableDistDirs) {
	const jsFiles = collectJavaScriptFiles(distDir);

	for (const filePath of jsFiles) {
		const original = readFileSync(filePath, "utf8");
		let changed = false;

		const patched = patchRelativeSpecifiers(original, filePath, () => {
			changed = true;
			patchedImports += 1;
		});

		if (!changed) {
			continue;
		}

		writeFileSync(filePath, patched);
		patchedFiles += 1;
	}
}

console.log(
	`[fix-elevenlabs-esm] Patched ${patchedImports} imports across ${patchedFiles} files.`,
);

function collectJavaScriptFiles(dirPath) {
	const entries = readdirSync(dirPath, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = join(dirPath, entry.name);

		if (entry.isDirectory()) {
			files.push(...collectJavaScriptFiles(entryPath));
			continue;
		}

		if (entry.isFile() && entry.name.endsWith(".js")) {
			files.push(entryPath);
		}
	}

	return files;
}

function collectElevenLabsDistDirs() {
	const elevenLabsRoot = resolve(process.cwd(), "node_modules/@elevenlabs");
	if (!existsSync(elevenLabsRoot)) {
		return [];
	}

	return readdirSync(elevenLabsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => resolve(elevenLabsRoot, entry.name, "dist"))
		.filter((distDir) => existsSync(distDir));
}

function patchRelativeSpecifiers(source, filePath, onPatch) {
	const patterns = [
		/(from\s+["'])(\.\.?(?:\/[^"'?#]+)+)(["'])/g,
		/(import\s+["'])(\.\.?(?:\/[^"'?#]+)+)(["'])/g,
	];

	return patterns.reduce((currentSource, pattern) => {
		return currentSource.replace(pattern, (fullMatch, prefix, specifier, suffix) => {
			if (hasRuntimeExtension(specifier)) {
				return fullMatch;
			}

			const resolvedSpecifier = resolvePatchedSpecifier(filePath, specifier);
			if (resolvedSpecifier === null) {
				return fullMatch;
			}

			onPatch();
			return `${prefix}${resolvedSpecifier}${suffix}`;
		});
	}, source);
}

function resolvePatchedSpecifier(filePath, specifier) {
	const jsTarget = resolve(dirname(filePath), `${specifier}.js`);
	if (existsSync(jsTarget)) {
		return `${specifier}.js`;
	}

	const indexTarget = resolve(dirname(filePath), specifier, "index.js");
	if (existsSync(indexTarget)) {
		return `${specifier}/index.js`;
	}

	return null;
}

function hasRuntimeExtension(specifier) {
	return [".js", ".mjs", ".cjs", ".json", ".node"].some((extension) =>
		specifier.endsWith(extension),
	);
}
