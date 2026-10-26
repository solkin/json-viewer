import { test } from "node:test";
import assert from "node:assert/strict";

// A controllable stand-in for the browser Worker: replies only when told to.
const workers = [];
globalThis.Worker = class {
  constructor() {
    this.sent = [];
    this.terminated = false;
    workers.push(this);
  }
  postMessage(message) {
    this.sent.push(message);
  }
  reply(result) {
    this.onmessage({ data: { id: this.sent.at(-1).id, result } });
  }
  terminate() {
    this.terminated = true;
  }
};
const { task, isCancelled } = await import("../src/tasks.js");
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("operations run one at a time; a newer keyed one supersedes the running one", async () => {
  const first = task("parse", { text: "1" }, "parse");
  const joined = task("parse", { text: "1" }, "parse");
  assert.equal(joined, first);
  const other = task("format", { text: "1", pretty: true });
  const worker = workers.at(-1);
  assert.equal(worker.sent.length, 1);

  const second = task("parse", { text: "2" }, "parse");
  await assert.rejects(first, isCancelled);
  assert.equal(worker.terminated, true);

  // The unkeyed operation queued behind it survives and runs on a new worker.
  const replacement = workers.at(-1);
  assert.notEqual(replacement, worker);
  assert.equal(replacement.sent[0].task, "format");
  replacement.reply("formatted");
  assert.equal(await other, "formatted");
  await tick();
  assert.equal(replacement.sent[1].task, "parse");
  replacement.reply("two");
  assert.equal(await second, "two");
});

test("queued keyed operations are replaced before they start", async () => {
  const blocker = task("schema", { text: "1", schema: "{}" });
  const stale = task("encode", { text: "a", format: "cbor" }, "encode");
  const fresh = task("encode", { text: "b", format: "cbor" }, "encode");
  await assert.rejects(stale, isCancelled);
  const worker = workers.at(-1),
    start = worker.sent.length;
  worker.reply([]);
  await blocker;
  await tick();
  assert.equal(worker.sent.length, start + 1);
  assert.equal(worker.sent.at(-1).args.text, "b");
  worker.reply("bytes");
  assert.equal(await fresh, "bytes");
});

test("the time budget starts when an operation starts, not when it is queued", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const slow = task("schema", { text: "1", schema: "{}" });
  const next = task("compare", { a: "1", b: "1" });
  const worker = workers.at(-1);
  t.mock.timers.tick(14000);
  worker.reply([]);
  await slow;
  await tick();
  t.mock.timers.tick(14000);
  worker.reply([]);
  assert.deepEqual(await next, []);

  const stuck = task("schema", { text: "2", schema: "{}" });
  const queued = task("compare", { a: "2", b: "2" });
  t.mock.timers.tick(15000);
  await assert.rejects(stuck, /time budget/);
  const fresh = workers.at(-1);
  assert.notEqual(fresh, worker);
  assert.equal(fresh.sent[0].task, "compare");
  fresh.reply([]);
  assert.deepEqual(await queued, []);
});
