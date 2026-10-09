import assert from "node:assert/strict";
import test from "node:test";
import {
  TRANSIENT_ATTEMPT_CAP,
  comicPagesAreComplete,
  isTransientGenerationError,
  noteTransientAttempt,
  storyTextForViewer,
  transientFailureMessage,
} from "./comicCompletion.ts";

test("a comic with no pages or blank image URLs is not complete", () => {
  assert.equal(comicPagesAreComplete([], 2), false);
  assert.equal(comicPagesAreComplete([{ pageNumber: 1, imageUrl: "" }], 1), false);
  assert.equal(
    comicPagesAreComplete([{ pageNumber: 1, imageUrl: "https://cdn.example/page-1.png" }], 2),
    false,
  );
});

test("every required page image is required before completion", () => {
  const pages = [
    { pageNumber: 1, imageUrl: "https://cdn.example/page-1.png" },
    { pageNumber: 2, imageUrl: "", panelImages: ["https://cdn.example/panel.png"] },
  ];
  assert.equal(comicPagesAreComplete(pages, 2), true);
});

test("429, 503, and timeouts retry until the persisted cap, then fail once", () => {
  assert.equal(isTransientGenerationError(new Error("Gemini error (429): quota")), true);
  assert.equal(isTransientGenerationError(new Error("Gemini API error (503): unavailable")), true);
  assert.equal(isTransientGenerationError(new Error("request timed out")), true);
  assert.equal(isTransientGenerationError(new Error("Gemini error (400): bad request")), false);

  let saved: Record<string, number> | undefined;
  let last: { count: number; retry: boolean } = { count: 0, retry: true };
  for (let i = 0; i < TRANSIENT_ATTEMPT_CAP; i += 1) {
    last = noteTransientAttempt(saved, "page-1");
    saved = last.attempts;
  }
  assert.equal(saved?.["page-1"], TRANSIENT_ATTEMPT_CAP);
  assert.equal(last.retry, false);
  assert.equal(noteTransientAttempt(undefined, "page-1").retry, true);
});

test("the final failure message names the step and status without the upstream body", () => {
  const message = transientFailureMessage(
    "page 1",
    new Error("Gemini error (429): upstream body sk-secret"),
    TRANSIENT_ATTEMPT_CAP,
  );
  assert.equal(message, "Gemini could not finish page 1 after 3 attempts (HTTP 429). Please try again later.");
  assert.equal(message.includes("sk-secret"), false);
});

test("image failure keeps story text when no page image was saved", () => {
  const payload = {
    _checkpoint: {
      v: 1,
      story: {
        title: "Immune",
        pages: [
          { pageNumber: 1, pageType: "cover", narration: "", dialogues: [], imageUrl: "" },
          {
            pageNumber: 2,
            pageType: "body",
            narration: "The city goes dark.",
            dialogues: [{ character: "Hero", text: "Everyone is special except me" }],
          },
        ],
      },
    },
  };
  const story = storyTextForViewer(payload);
  assert.equal(story?.title, "Immune");
  assert.equal(story?.pages.length, 2);
  assert.equal(story?.pages[1]?.narration, "The city goes dark.");
  assert.deepEqual(story?.pages[1]?.dialogues, [
    { character: "Hero", text: "Everyone is special except me" },
  ]);
  assert.equal(comicPagesAreComplete([], 2), false);
  assert.equal(storyTextForViewer({ _checkpoint: { story: { pages: [] } } }), null);
});
