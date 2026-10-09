import assert from "node:assert/strict";
import test from "node:test";
import { requeuePayloadAfterStall } from "./comicJobStall.ts";

test("a stalled job stays requeueable until the stall cap, then the worker should refund it", () => {
  const payload = { storyPrompt: "A short test", style: "Comic", _checkpoint: { v: 1 as const, stalls: 11 } };
  const requeued = requeuePayloadAfterStall(payload);
  assert.ok(requeued);
  assert.equal(requeued?._checkpoint?.stalls, 12);

  const refund = requeuePayloadAfterStall({
    storyPrompt: "A short test",
    style: "Comic",
    _checkpoint: { v: 1, stalls: 12 },
  });
  assert.equal(refund, null);
});

test("a payload that is not a comic request cannot be requeued", () => {
  assert.equal(requeuePayloadAfterStall(null), null);
  assert.equal(requeuePayloadAfterStall({ style: "Comic" }), null);
});
