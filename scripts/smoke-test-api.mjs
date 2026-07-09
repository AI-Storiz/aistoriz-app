#!/usr/bin/env node
/**
 * Read-only smoke test for API endpoints used during Google Play review.
 * Usage: node scripts/smoke-test-api.mjs [baseUrl]
 */

const baseUrl = (process.argv[2] || process.env.EXPO_PUBLIC_API_URL || "https://aistorizapi.fiocreatives.com/").replace(/\/?$/, "/");

const checks = [
  { name: "OAuth config", path: "/api/oauth-config" },
  { name: "Credit settings", path: "/api/credits/settings" },
];

async function runCheck({ name, path }) {
  const url = new URL(path, baseUrl).toString();
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const ok = res.ok && json !== null;
    return {
      name,
      url,
      ok,
      status: res.status,
      ms: Date.now() - started,
      sample: json ? JSON.stringify(json).slice(0, 120) : text.slice(0, 120),
    };
  } catch (error) {
    return {
      name,
      url,
      ok: false,
      status: 0,
      ms: Date.now() - started,
      sample: error instanceof Error ? error.message : String(error),
    };
  }
}

console.log(`Smoke testing API: ${baseUrl}\n`);

const results = await Promise.all(checks.map(runCheck));
let passed = 0;

for (const result of results) {
  const mark = result.ok ? "PASS" : "FAIL";
  if (result.ok) passed += 1;
  console.log(`[${mark}] ${result.name} (${result.status}, ${result.ms}ms)`);
  console.log(`       ${result.url}`);
  console.log(`       ${result.sample}\n`);
}

console.log(`${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
