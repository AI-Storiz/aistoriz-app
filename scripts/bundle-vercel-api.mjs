import { build } from "esbuild";
import { readFile, rm } from "node:fs/promises";

/**
 * Vercel compiles api/index.ts to ESM and keeps extensionless imports.
 * With "type": "module", Node then fails to load ../server/index.
 * Bundle the function so the deployed entry has no relative server import.
 */
await build({
  entryPoints: ["api/index.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  logLevel: "info",
});

const generated = await readFile("api/index.js", "utf8");
if (/from\s+["'][^"']*server\/index["']/.test(generated) || /\/server\/index["']/.test(generated)) {
  throw new Error("Vercel API bundle still imports server/index");
}

if (process.env.VERCEL) {
  await rm("api/index.ts");
}
