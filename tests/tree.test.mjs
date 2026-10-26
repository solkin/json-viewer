import { test } from "node:test";
import assert from "node:assert/strict";
import { JsonTree } from "../src/tree.js";
function model(value) {
  const tree = Object.create(JsonTree.prototype);
  Object.assign(tree, {
    active: true,
    value,
    expanded: new Set([value]),
    collapsed: new Set(),
    expandEverything: false,
    sizes: new WeakMap(),
  });
  return tree;
}
test("tree traverses only expanded branches and indexes the scrolled window", () => {
  const value = Array.from({ length: 10000 }, (_, i) => ({
    i,
    nested: { x: i },
  }));
  const tree = model(value);
  assert.equal(tree.size(value), 10001);
  assert.equal(tree.rows(0, 30).length, 30);
  assert.equal(tree.rows(9000, 9030)[0].path, "$[8999]");
  tree.expandEverything = true;
  tree.sizes = new WeakMap();
  assert.equal(tree.size(value), 40001);
  assert.equal(tree.rows(30000, 30030).length, 30);
  tree.collapsed.add(value[0]);
  tree.sizes = new WeakMap();
  assert.equal(tree.size(value), 39998);
});
test("tree never allocates DOM proportional to document size, including Expand All", () => {
  let created = 0;
  const element = () => ({
    style: {},
    dataset: {},
    classList: { add() {} },
    setAttribute() {},
    append() {},
    replaceChildren() {},
  });
  const previous = globalThis.document;
  globalThis.document = {
    createElement() {
      created++;
      return element();
    },
  };
  try {
    const tree = model(
      Array.from({ length: 10000 }, (_, i) => ({ i, nested: { x: i } })),
    );
    tree.host = { scrollTop: 0, clientHeight: 480, replaceChildren() {} };
    tree.render();
    assert.ok(created < 200, created);
    created = 0;
    tree.expandEverything = true;
    tree.sizes = new WeakMap();
    tree.render();
    assert.ok(created < 200, created);
    assert.ok(tree.rendered.length <= 36);
  } finally {
    globalThis.document = previous;
  }
});
test("clearing a document releases its tree and blocks stale resize renders", () => {
  const value = { a: Array(10000).fill(1) },
    tree = model(value);
  let renders = 0;
  tree.host = {
    replaceChildren() {
      renders++;
    },
  };
  tree.clear();
  tree.render();
  assert.equal(renders, 0);
  assert.equal(tree.value, undefined);
  assert.equal(tree.expanded.size, 0);
});
