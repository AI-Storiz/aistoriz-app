import assert from "node:assert/strict";
import test from "node:test";
import { previewPagesAfterImageFailure } from "./storyFallback.ts";

test("text-only fallback keeps narration and dialogue when the image URL is missing", () => {
  const pages = previewPagesAfterImageFailure(
    {
      title: "Immune",
      pages: [
        {
          pageNumber: 1,
          pageType: "body",
          narration: "The city goes dark.",
          dialogues: [{ character: "Hero", text: "Everyone is special except me" }],
        },
        {
          pageNumber: 2,
          pageType: "body",
          narration: "The ally arrives.",
          dialogues: [{ character: "Ally", text: "You're the only one immune" }],
        },
      ],
    },
    [
      { pageNumber: 1, imageUrl: "" },
      { pageNumber: 2, imageUrl: "https://cdn.example/page-2.png", generationMode: "gemini-fullpage" },
    ],
  );

  assert.ok(pages);
  assert.equal(pages[0]?.imageUrl, "");
  assert.equal(pages[0]?.narration, "The city goes dark.");
  assert.equal(pages[0]?.scenes.dialogue, "Hero: Everyone is special except me");
  assert.equal(pages[1]?.imageUrl, "https://cdn.example/page-2.png");
  assert.equal(pages[1]?.generationMode, "gemini-fullpage");
  assert.equal(previewPagesAfterImageFailure(null, []), null);
});
