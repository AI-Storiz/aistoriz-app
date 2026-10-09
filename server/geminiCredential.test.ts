import assert from "node:assert/strict";
import test from "node:test";
import {
  GEMINI_IMAGE_MODEL,
  GEMINI_KEY_MISSING_MESSAGE,
  GEMINI_TEXT_MODEL,
  resolveGeminiImageModel,
  resolveGeminiTextModel,
  selectGeminiApiKey,
} from "./geminiCredential.ts";

const imageKey = "AIza-image-key";
const envKey = "AIza-env-key";
const storyKey = "AIza-story-key";

test("Gemini image admin key is preferred over the env var and story field", () => {
  assert.deepEqual(selectGeminiApiKey(imageKey, storyKey, envKey), {
    apiKey: imageKey,
    source: "admin-image",
  });
});

test("GEMINI_API_KEY is used when the image key is empty", () => {
  assert.deepEqual(selectGeminiApiKey("", storyKey, `  ${envKey}  `), {
    apiKey: envKey,
    source: "env",
  });
});

test("the story field is used only after the image key and env var", () => {
  assert.deepEqual(selectGeminiApiKey("", storyKey, ""), {
    apiKey: storyKey,
    source: "admin-story",
  });
});

test("empty values and whitespace are rejected", () => {
  assert.throws(
    () => selectGeminiApiKey("   ", "bad key", "also bad"),
    (error: unknown) => error instanceof Error && error.message === GEMINI_KEY_MISSING_MESSAGE,
  );
  assert.throws(
    () => selectGeminiApiKey("", "", ""),
    (error: unknown) => error instanceof Error && error.message === GEMINI_KEY_MISSING_MESSAGE,
  );
});

test("retired Gemini model ids map to the current text and image models", () => {
  assert.equal(resolveGeminiTextModel("gemini-2.0-flash"), GEMINI_TEXT_MODEL);
  assert.equal(resolveGeminiTextModel("gemini-1.5-pro"), GEMINI_TEXT_MODEL);
  assert.equal(resolveGeminiTextModel(""), GEMINI_TEXT_MODEL);
  assert.equal(resolveGeminiTextModel(GEMINI_TEXT_MODEL), GEMINI_TEXT_MODEL);
  assert.equal(resolveGeminiImageModel("gemini-2.5-flash-image"), GEMINI_IMAGE_MODEL);
  assert.equal(resolveGeminiImageModel("gemini-3-pro-image-preview"), "gemini-3-pro-image");
  assert.equal(resolveGeminiImageModel(GEMINI_IMAGE_MODEL), GEMINI_IMAGE_MODEL);
});
