import type { ImageSource } from "expo-image";

/**
 * expo-image is more reliable for authenticated comic assets when the JWT is sent
 * as Authorization (some stacks mishandle very long ?token= query strings).
 * Strips token from the URL when headers are used.
 */
export function authedComicImageSource(
  rawUrl: string | undefined | null,
  token: string | null | undefined
): string | ImageSource {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("data:") || trimmed.startsWith("file:") || trimmed.startsWith("asset:")) {
    return trimmed;
  }
  if (!token || !trimmed.includes("/api/comics/")) {
    return trimmed;
  }
  try {
    const u = new URL(trimmed);
    const qp = u.searchParams.get("token");
    const bearer = qp && qp.length > 0 ? qp : token;
    u.searchParams.delete("token");
    const uri = u.toString();
    return {
      uri,
      headers: { Authorization: `Bearer ${bearer}` },
    };
  } catch {
    return trimmed;
  }
}
