import { build } from "esbuild";
import { readFile } from "node:fs/promises";

/**
 * Refresh the committed api/index.js bundle in place.
 * Vercel matches `functions` before `buildCommand`, so this file must already
 * exist in git. The source lives in api/_handler.ts, which Vercel does not
 * deploy as its own function.
 */
await build({
  entryPoints: ["api/_handler.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  logLevel: "info",
});

const generated = await readFile("api/index.js", "utf8");
if (/from\s+["'][^"']*server\/index["']/.test(generated)) {
  throw new Error("Vercel API bundle still imports server/index");
}
