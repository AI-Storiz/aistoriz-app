import assert from "node:assert/strict";
import { comicCreditCost, parseComicPageCount } from "../shared/creditCost.ts";
import { dedupeIdenticalPreviewPages } from "../shared/previewPages.ts";
import { classifyCharacterPhotoInput } from "../shared/characterPhoto.ts";

const base = 20;
const perPage = 15;

assert.equal(comicCreditCost(base, perPage, 1), 20);
assert.equal(comicCreditCost(base, perPage, 3), 50);
assert.equal(comicCreditCost(base, perPage, 5), 80);
assert.equal(parseComicPageCount("3"), 3);
assert.equal(parseComicPageCount(1), 1);
assert.equal(parseComicPageCount(undefined), null);
assert.equal(parseComicPageCount(0), null);
assert.equal(parseComicPageCount(6), 6);

const displayedOnePage = comicCreditCost(base, perPage, 1);
const displayedThreePages = comicCreditCost(base, perPage, 3);
assert.equal(displayedOnePage, 20);
assert.equal(55 >= displayedThreePages, true, "55 credits cover a 50-credit 3-page comic");
assert.equal(55 >= comicCreditCost(base, perPage, 6), false, "a missing page count must not be billed as 6 pages");

const duplicateCover = dedupeIdenticalPreviewPages([
  { imageUrl: "https://cdn.example/page.jpg", panelImages: ["https://cdn.example/page.jpg"] },
  { imageUrl: "https://cdn.example/page.jpg", panelImages: ["https://cdn.example/page.jpg"] },
]);
assert.equal(duplicateCover.length, 1);

const multiImage = dedupeIdenticalPreviewPages([
  {
    imageUrl: "https://cdn.example/a.jpg",
    panelImages: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg", "https://cdn.example/c.jpg"],
  },
]);
assert.equal(multiImage.length, 1);
assert.equal(multiImage[0].panelImages.length, 3);

assert.equal(classifyCharacterPhotoInput("file:///data/user/0/photo.jpg"), "invalid");
assert.equal(classifyCharacterPhotoInput("content://media/external/images/1"), "invalid");
assert.equal(classifyCharacterPhotoInput("data:image/jpeg;base64,aaaa"), "data");
assert.equal(classifyCharacterPhotoInput("https://cdn.example/photo.jpg"), "remote");
assert.equal(classifyCharacterPhotoInput(null), "empty");

console.log("v1.0.4 fix checks passed");
