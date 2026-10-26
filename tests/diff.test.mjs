import { test } from "node:test";
import assert from "node:assert/strict";
import { compareDocuments } from "../src/diff.js";
test("comparison distinguishes adjacent large integers", () =>
  assert.equal(
    compareDocuments('{"id":9007199254740993}', '{"id":9007199254740992}')
      .length,
    1,
  ));
test("comparison normalizes exact numeric values and ignores object key order", () =>
  assert.deepEqual(
    compareDocuments('{"a":1e400,"b":1.2e3}', '{"b":1200,"a":10e399}'),
    [],
  ));
test("comparison keeps special object keys", () =>
  assert.equal(compareDocuments('{"__proto__":1}', "{}")[0].kind, "only_left"));
test("comparison bounds returned previews for giant subtrees", () => {
  const out = compareDocuments(
    "{}",
    JSON.stringify({ x: Array(100000).fill("hello") }),
  );
  assert.ok(JSON.stringify(out).length < 1000);
});
