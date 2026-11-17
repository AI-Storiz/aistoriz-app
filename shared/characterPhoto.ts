/** Local file and content URIs cannot be read by the API. */
export function classifyCharacterPhotoInput(
  imageData: string | null | undefined,
): "empty" | "data" | "remote" | "invalid" {
  const t = (imageData ?? "").trim();
  if (t.length === 0) return "empty";
  if (t.startsWith("data:")) return "data";
  if (t.startsWith("https://") || t.startsWith("http://")) return "remote";
  return "invalid";
}
