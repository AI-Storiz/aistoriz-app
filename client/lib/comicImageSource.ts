import type { ImageSource } from "expo-image";

/**
 * expo-image source for comic panels.
 * Public https URLs (S3 / CDN) are used as-is — no base64, no app proxy.
 * For legacy `/api/comics/.../image?token=` URLs, strips the token query and sends Authorization instead.
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
