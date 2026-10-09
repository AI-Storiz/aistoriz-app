export const OPENAI_API_BASE_URL = "https://api.openai.com/v1";

export const OPENAI_KEY_MISSING_MESSAGE =
  "OpenAI API key not configured. Save an OpenAI key that starts with sk- in Admin Providers, or set OPENAI_API_KEY on the server.";

export function isUsableOpenAIKey(apiKey: string | undefined | null): apiKey is string {
  return !!apiKey &&
    !apiKey.includes("DUMMY") &&
    apiKey.length > 10 &&
    apiKey.startsWith("sk-");
}

/** Admin key wins when it passes the format check. Otherwise use the trimmed server variable. */
export function selectOpenAIApiKey(
  adminKey: string | undefined | null,
  envKey: string | undefined | null,
): string {
  const trimmedEnv = typeof envKey === "string" ? envKey.trim() : envKey;
  const apiKey = isUsableOpenAIKey(adminKey) ? adminKey : trimmedEnv;
  if (!isUsableOpenAIKey(apiKey)) {
    throw new Error(OPENAI_KEY_MISSING_MESSAGE);
  }
  return apiKey;
}
