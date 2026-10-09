export const GEMINI_TEXT_MODEL = "gemini-3.5-flash";
export const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
export const GEMINI_IMAGE_MODALITIES = ["TEXT", "IMAGE"] as const;

export const GEMINI_KEY_MISSING_MESSAGE =
  "Gemini API key not configured. Save a Gemini key in Admin Providers, or set GEMINI_API_KEY on the server.";

const RETIRED_TEXT_MODELS: Record<string, string> = {
  "gemini-2.0-flash": GEMINI_TEXT_MODEL,
  "gemini-1.5-pro": GEMINI_TEXT_MODEL,
  "gemini-1.5-flash": GEMINI_TEXT_MODEL,
  "gemini-2.0-flash-exp": GEMINI_TEXT_MODEL,
};

const RETIRED_IMAGE_MODELS: Record<string, string> = {
  "gemini-2.5-flash-image": GEMINI_IMAGE_MODEL,
  "gemini-3-pro-image-preview": "gemini-3-pro-image",
};

export type GeminiKeySource = "admin-image" | "env" | "admin-story";

export function normalizeGeminiKey(apiKey: string | undefined | null): string | null {
  if (typeof apiKey !== "string") return null;
  const trimmed = apiKey.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Image-card key, then GEMINI_API_KEY, then the Story Text Gemini field.
 * A value with whitespace is ignored.
 */
export function selectGeminiApiKey(
  imageKey: string | undefined | null,
  storyKey: string | undefined | null,
  envKey: string | undefined | null,
): { apiKey: string; source: GeminiKeySource } {
  const image = normalizeGeminiKey(imageKey);
  if (image) return { apiKey: image, source: "admin-image" };
  const env = normalizeGeminiKey(envKey);
  if (env) return { apiKey: env, source: "env" };
  const story = normalizeGeminiKey(storyKey);
  if (story) return { apiKey: story, source: "admin-story" };
  throw new Error(GEMINI_KEY_MISSING_MESSAGE);
}

export function resolveGeminiTextModel(model: string | undefined | null): string {
  const value = (model || "").trim();
  if (!value) return GEMINI_TEXT_MODEL;
  return RETIRED_TEXT_MODELS[value] || value;
}

export function resolveGeminiImageModel(model: string | undefined | null): string {
  const value = (model || "").trim();
  if (!value) return GEMINI_IMAGE_MODEL;
  return RETIRED_IMAGE_MODELS[value] || value;
}
