import assert from "node:assert/strict";
import test from "node:test";
import { characterPhotoAction } from "../shared/characterPhoto.ts";
import { pagesForRequestedCount } from "../shared/previewPages.ts";
import {
  partitionSavedHistory,
  savedHistoryDeleteMatch,
  shouldApplyHistoryFetch,
} from "../shared/historyClear.ts";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
process.env.COMIC_STORAGE_BUCKET = "comics";

const { uploadCharacterPhotoToS3OrThrow, bufferFromRawBase64Image, ComicS3Error } = await import(
  "./comicS3.ts"
);

const OWN_PHOTO =
  "https://example.supabase.co/storage/v1/object/public/comics/comic-assets/character-photos/user/photo.jpg";
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8l8kAAAAASUVORK5CYII=";

test("character photo: Android local URIs are rejected and a hosted URL is not uploaded again", async () => {
  assert.equal(characterPhotoAction("file:///data/user/0/photo.jpg", () => false), "invalid");
  assert.equal(characterPhotoAction("content://media/external/images/1", () => false), "invalid");
  assert.equal(
    characterPhotoAction("data:image/jpeg;base64,aaaa", () => false),
    "upload-data",
  );
  assert.equal(characterPhotoAction(OWN_PHOTO, () => true), "keep");
  assert.equal(characterPhotoAction(`"${OWN_PHOTO}"`, () => true), "keep");
  assert.equal(
    characterPhotoAction("https://images.example/other.jpg", () => false),
    "upload-remote",
  );
  assert.equal(characterPhotoAction(PNG_BASE64, () => false), "upload-base64");
  assert.equal(bufferFromRawBase64Image(PNG_BASE64)?.contentType, "image/png");
  assert.equal(bufferFromRawBase64Image("not-an-image"), null);

  let fetched = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetched = true;
    throw new Error("already-uploaded photo must not be fetched");
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => uploadCharacterPhotoToS3OrThrow("user-1", "content://media/picker/1"),
      (error: unknown) => {
        assert.ok(error instanceof ComicS3Error);
        assert.match(error.message, /Invalid character photo/);
        return true;
      },
    );
    const stored = await uploadCharacterPhotoToS3OrThrow("user-1", OWN_PHOTO);
    assert.equal(stored, OWN_PHOTO);
    assert.equal(fetched, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("one-page comic keeps a single image and multi-page comics keep their pages", () => {
  const onePage = pagesForRequestedCount(
    [
      {
        pageNumber: 1,
        imageUrl: "https://cdn.example/cover.jpg",
        panelImages: ["https://cdn.example/cover.jpg", "https://cdn.example/same-scene.jpg"],
      },
      {
        pageNumber: 2,
        imageUrl: "https://cdn.example/duplicate-page.jpg",
        panelImages: ["https://cdn.example/duplicate-page.jpg"],
      },
    ],
    1,
  );
  assert.equal(onePage.length, 1);
  assert.equal(onePage[0]?.imageUrl, "https://cdn.example/cover.jpg");
  assert.deepEqual(onePage[0]?.panelImages, ["https://cdn.example/cover.jpg"]);

  const multi = pagesForRequestedCount(
    [
      {
        imageUrl: "https://cdn.example/p1.jpg",
        panelImages: ["https://cdn.example/p1a.jpg", "https://cdn.example/p1b.jpg", "https://cdn.example/p1c.jpg"],
      },
      { imageUrl: "https://cdn.example/p2.jpg", panelImages: ["https://cdn.example/p2.jpg"] },
      { imageUrl: "https://cdn.example/p3.jpg", panelImages: ["https://cdn.example/p3.jpg"] },
    ],
    3,
  );
  assert.equal(multi.length, 3);
  assert.equal(multi[0]?.panelImages?.length, 3);
  assert.equal(multi[1]?.imageUrl, "https://cdn.example/p2.jpg");
  assert.equal(multi[2]?.imageUrl, "https://cdn.example/p3.jpg");
});

test("clear history removes saved comics and a later fetch does not restore them", () => {
  const characters = [{ id: "char-1", userId: "user-1", name: "Aya" }];
  const account = { id: "user-1", credits: 20 };
  const comics = [
    { id: 1, userId: "user-1", isDraft: false, title: "One page" },
    { id: 2, userId: "user-1", isDraft: true, title: "In progress" },
    { id: 3, userId: "user-2", isDraft: false, title: "Someone else" },
  ];

  assert.equal(savedHistoryDeleteMatch("user-1", false, "user-1"), true);
  assert.equal(savedHistoryDeleteMatch("user-1", true, "user-1"), false);
  assert.equal(savedHistoryDeleteMatch("user-2", false, "user-1"), false);

  const { removed, kept } = partitionSavedHistory(comics, "user-1");
  assert.deepEqual(removed.map((row) => row.id), [1]);
  assert.deepEqual(kept.map((row) => row.id), [2, 3]);
  assert.equal(characters[0]?.name, "Aya");
  assert.equal(account.credits, 20);

  let revision = 0;
  let visible = removed.map((row) => row.id);
  const startedRevision = revision;
  revision += 1;
  visible = [];
  const staleFetch = { revision: startedRevision, comics: [1] };
  if (shouldApplyHistoryFetch(revision, staleFetch.revision)) {
    visible = staleFetch.comics;
  }
  assert.deepEqual(visible, []);

  const refetch = { revision, comics: [] as number[] };
  if (shouldApplyHistoryFetch(revision, refetch.revision)) {
    visible = refetch.comics;
  }
  assert.deepEqual(visible, []);
  assert.deepEqual(kept.map((row) => row.id), [2, 3]);
});
