import assert from "node:assert/strict";
import test from "node:test";
import {
  OPENAI_API_BASE_URL,
  OPENAI_KEY_MISSING_MESSAGE,
  isUsableOpenAIKey,
  selectOpenAIApiKey,
} from "./openaiCredential.ts";

const adminKey = "sk-admin-key-value";
const envKey = "sk-env-key-value";

test("story text always targets the public OpenAI API", () => {
  assert.equal(OPENAI_API_BASE_URL, "https://api.openai.com/v1");
});

test("a usable admin key is selected ahead of the server variable", () => {
  assert.equal(selectOpenAIApiKey(adminKey, envKey), adminKey);
});

test("an empty or non-standard admin key falls through to OPENAI_API_KEY", () => {
  assert.equal(selectOpenAIApiKey("", envKey), envKey);
  assert.equal(selectOpenAIApiKey("k-proj-replit-token", envKey), envKey);
  assert.equal(selectOpenAIApiKey("DUMMY-sk-placeholder-key", envKey), envKey);
  assert.equal(selectOpenAIApiKey("sk-short", envKey), envKey);
});

test("the server variable is trimmed and must pass the same format check", () => {
  assert.equal(selectOpenAIApiKey("", `  ${envKey}  `), envKey);
  assert.equal(isUsableOpenAIKey("  sk-not-trimmed"), false);
});

test("missing and invalid credentials raise the admin configuration error", () => {
  assert.throws(
    () => selectOpenAIApiKey("", ""),
    (error: unknown) => error instanceof Error && error.message === OPENAI_KEY_MISSING_MESSAGE,
  );
  assert.throws(
    () => selectOpenAIApiKey("k-proj-replit-token", "not-an-openai-key"),
    (error: unknown) => error instanceof Error && error.message === OPENAI_KEY_MISSING_MESSAGE,
  );
});
