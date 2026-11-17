/** Local file and content URIs cannot be read by the API. */
export function classifyCharacterPhotoInput(
  imageData: string | null | undefined,
): "empty" | "data" | "remote" | "invalid" {
  const t = normalizeCharacterPhotoInput(imageData);
  if (t.length === 0) return "empty";
  if (t.startsWith("data:")) return "data";
  if (/^https?:\/\//i.test(t)) return "remote";
  return "invalid";
}

/** Strip a BOM or a single pair of wrapping quotes before format checks. */
export function normalizeCharacterPhotoInput(imageData: string | null | undefined): string {
  let t = (imageData ?? "").trim().replace(/^\uFEFF/, "");
  if (t.length >= 2) {
    const quote = t[0];
    if ((quote === '"' || quote === "'") && t.endsWith(quote)) {
      t = t.slice(1, -1).trim();
    }
  }
  return t;
}

export type CharacterPhotoAction =
  | "empty"
  | "keep"
  | "upload-data"
  | "upload-remote"
  | "upload-base64"
  | "invalid";

const RAW_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Decide what the API should do with a character photo.
 * `keep` means the value is already an app asset URL and must not be uploaded again.
 * `file://` and `content://` are `invalid`.
 */
export function characterPhotoAction(
  imageData: string | null | undefined,
  isOwnAsset: (url: string) => boolean,
): CharacterPhotoAction {
  const t = normalizeCharacterPhotoInput(imageData);
  if (t.length === 0) return "empty";
  const kind = classifyCharacterPhotoInput(t);
  if (kind === "data") return "upload-data";
  if (kind === "remote") return isOwnAsset(t) ? "keep" : "upload-remote";
  const compact = t.replace(/\s/g, "");
  if (compact.length >= 64 && RAW_BASE64.test(compact)) return "upload-base64";
  return "invalid";
}
