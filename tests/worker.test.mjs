import { test } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { reviveParsed, stringifyJson } from "../src/json.js";
test("deployed worker entry executes lazy chunks and returns transportable results", async () => {
  const worker = new Worker(new URL("./worker-host.mjs", import.meta.url));
  let id = 0;
  const pending = new Map();
  worker.on("message", (message) => {
    const job = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? job.reject(new Error(message.error))
      : job.resolve(message.result);
  });
  const task = (task, args) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      worker.postMessage({ id, task, args });
    });
  try {
    const text = '{"id":9007199254740993}';
    const parsed = await task("parse", { text });
    assert.equal(
      stringifyJson(reviveParsed(parsed.value, parsed.numbers)),
      text,
    );
    assert.match(
      await task("format", { text, pretty: true }),
      /9007199254740993/,
    );
    assert.equal(
      (await task("schema", { text: "123", schema: "false" })).length,
      1,
    );
    assert.equal(
      await task("yamlDecode", { text: "a: |\n  hello\n  world" }),
      '{\n  "a": "hello\\nworld\\n"\n}',
    );
    for (const format of ["bson", "msgpack", "cbor"]) {
      const bytes = await task("encode", { text: '{"a":{}}', format });
      assert.equal(await task("decode", { bytes, format }), '{\n  "a": {}\n}');
    }
    assert.equal(
      (await task("compare", { a: "9007199254740993", b: "9007199254740992" }))
        .length,
      1,
    );
    await assert.rejects(task("parse", { text: "{" }));
  } finally {
    await worker.terminate();
  }
});
