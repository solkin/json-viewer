import { jsonLanguage } from "@codemirror/lang-json";
import { highlightTree, classHighlighter } from "@lezer/highlight";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseJson,
  stringifyJson,
  formatJsonText,
  normalizeNumber,
  analyzeDocument,
  reviveParsed,
  isLosslessNumber,
} from "../src/json.js";
import { parseYaml, stringifyYaml } from "../src/yaml.js";
import { validateSchema, generateSchema } from "../src/schema.js";
import { encodeBinary, decodeBinary } from "../src/binary.js";

for (const text of [
  '{"id":9007199254740993,"n":1e400,"decimal":1.234567890123456789}',
  '{"a":1,"a":2,"z":-0,"empty":[]}',
  '{ "s" : "true [null] \\" \\n" }',
]) {
  test("format preserves literals: " + text, () => {
    const min = formatJsonText(text, false);
    const pretty = formatJsonText(text, true);
    assert.equal(formatJsonText(pretty, false), min);
    assert.deepEqual(JSON.parse(min), JSON.parse(text));
    if (text.includes("9007199254740993")) {
      assert.match(min, /9007199254740993/);
      assert.match(min, /1e400/);
      assert.match(min, /1\.234567890123456789/);
    }
  });
}
test("editor language keeps strings atomic and recognizes numeric keys and negative numbers", () => {
  const text = '{\n "123" \n : "true 123 [null] <script>", "n": -42\n}';
  const spans = [];
  highlightTree(
    jsonLanguage.parser.parse(text),
    classHighlighter,
    (from, to, classes) => spans.push({ text: text.slice(from, to), classes }),
  );
  assert.ok(
    spans.some(
      (s) =>
        s.text === '"true 123 [null] <script>"' && s.classes.includes("string"),
    ),
  );
  assert.ok(
    spans.some((s) => s.text === '"123"' && s.classes.includes("propertyName")),
  );
  assert.ok(
    spans.some((s) => s.text === "-42" && s.classes.includes("number")),
  );
  assert.ok(
    !spans.some(
      (s) => s.text === "true" || s.text === "123" || s.text === "null",
    ),
  );
});
test("lossless parsing and worker transport retain exact numbers without spoofing", () => {
  const text =
    '{"n":9007199254740993,"huge":1e400,"isLosslessNumber":true,"value":"hi"}';
  const result = analyzeDocument(text),
    clone = structuredClone(result);
  const value = reviveParsed(clone.value, clone.numbers);
  assert.equal(stringifyJson(value), text);
  assert.equal(isLosslessNumber(value), false);
  assert.equal(normalizeNumber("1.2e3"), normalizeNumber("1200"));
});
const schemaCases = [
  [123, false, false],
  [123, { $ref: "#/$defs/s", $defs: { s: { type: "string" } } }, false],
  [123, { type: "string", anyOf: [{ type: "number" }] }, false],
  [{}, { type: "object", required: ["constructor"] }, false],
  [{ b: 2, a: 1 }, { enum: [{ a: 1, b: 2 }] }, true],
  [
    [
      { a: 1, b: 2 },
      { b: 2, a: 1 },
    ],
    { uniqueItems: true },
    false,
  ],
  [null, { type: "null" }, true],
  ["😀", { minLength: 1, maxLength: 1 }, true],
  [{ x: 3 }, { type: "object", properties: { x: { type: "number" } } }, true],
  [
    123,
    { $schema: "http://json-schema.org/draft-07/schema#", type: "string" },
    false,
  ],
];
for (const [value, schema, valid] of schemaCases)
  test("schema " + JSON.stringify(schema), () =>
    assert.equal(validateSchema(value, schema).errors.length === 0, valid),
  );
test("unknown schema keywords are reported, unresolved refs fail explicitly", () => {
  const result = validateSchema("x", {
    type: "integer",
    example: 1,
    "x-vendor": true,
  });
  assert.equal(result.errors.length, 1);
  assert.deepEqual(result.warnings, [
    "Ignored unknown keywords: example, x-vendor",
  ]);
  assert.deepEqual(validateSchema(1, { type: "integer" }).warnings, []);
  assert.throws(() =>
    validateSchema(1, { $ref: "https://example.com/missing" }),
  );
});
for (const $schema of [
  "http://json-schema.org/draft-07/schema",
  "http://json-schema.org/draft-07/schema#",
  "https://json-schema.org/draft-07/schema",
  "https://json-schema.org/draft-07/schema#",
  "https://json-schema.org/draft/2020-12/schema",
  "https://json-schema.org/draft/2020-12/schema#",
])
  test("schema dialect " + $schema, () =>
    assert.equal(
      validateSchema(1, { $schema, type: "string" }).errors.length,
      1,
    ),
  );
test("unsupported or prototype-named dialects are refused", () => {
  for (const $schema of [
    "constructor",
    "http://json-schema.org/draft-04/schema#",
  ])
    assert.throws(() => validateSchema(1, { $schema }), /Supported/);
});
test("large integers validate unless the schema compares numeric values", () => {
  const doc = parseJson('{"id":12345678901234567890,"name":"x"}');
  assert.deepEqual(
    validateSchema(doc, {
      type: "object",
      properties: { id: { type: "integer" }, name: { enum: ["x", "y"] } },
    }).errors,
    [],
  );
  assert.equal(
    validateSchema(parseJson("12345678901234567890"), { type: "string" }).errors
      .length,
    1,
  );
  for (const schema of [
    { properties: { id: { maximum: 1e30 } } },
    { properties: { id: { enum: [1, 2] } } },
    { uniqueItems: true },
  ])
    assert.throws(
      () => validateSchema(parseJson('{"id":12345678901234567890}'), schema),
      /compares numeric values/,
    );
  assert.throws(
    () => validateSchema(parseJson("1.00000000000000000001"), {}),
    /exactly/,
  );
  assert.deepEqual(generateSchema(parseJson("12345678901234567890")), {
    type: "integer",
  });
});
for (const value of [
  [{ a: 1 }, { a: "x" }],
  [[1], ["x"]],
  [1, 1, 2, null],
  JSON.parse('{"__proto__":1,"constructor":2}'),
])
  test("generated schema accepts its input " + JSON.stringify(value), () =>
    assert.deepEqual(validateSchema(value, generateSchema(value)).errors, []),
  );
for (const value of [
  "hello\nworld",
  "hello\nworld\n",
  { "a\nb": 1 },
  JSON.parse('{"__proto__":{"x":1},"ok":2}'),
  { text: " # [true] : yes", lines: "a\nb\n\n" },
])
  test("YAML roundtrip " + JSON.stringify(value), () =>
    assert.deepEqual(
      parseJson(stringifyJson(parseYaml(stringifyYaml(value)))),
      value,
    ),
  );
for (const text of ['x: "hello" garbage', "x: [1, 2] garbage", "a: 1\na: 2"])
  test("YAML rejects invalid input " + text, () =>
    assert.throws(() => parseYaml(text)),
  );
test("YAML anchors, merge, flow, block and document streams", () => {
  assert.equal(
    stringifyJson(parseYaml("a: &a {x: 1}\nb: {<<: *a, y: 2}")),
    '{"a":{"x":1},"b":{"x":1,"y":2}}',
  );
  assert.equal(
    stringifyJson(parseYaml("---\nx: |\n  hello\n  world\n---\n[1, 2]")),
    '[{"x":"hello\\nworld\\n"},[1,2]]',
  );
});
test("YAML expansion and cycles are bounded", () => {
  let text = "a: &a [x, x, x, x, x, x, x, x]\n";
  for (let i = 1; i < 6; i++) {
    const n = String.fromCharCode(97 + i),
      p = String.fromCharCode(96 + i);
    text +=
      n +
      ": &" +
      n +
      " [" +
      Array(8)
        .fill("*" + p)
        .join(", ") +
      "]\n";
  }
  assert.throws(() => parseYaml(text));
  assert.throws(() => parseYaml("a: &a [*a]"));
});
for (const format of ["bson", "msgpack", "cbor"]) {
  for (const value of [
    {},
    { 0: "x" },
    { a: {} },
    JSON.parse('{"__proto__":{"x":1},"ok":2}'),
    { a: [true, null, 1.5, "Привет 😀"] },
  ])
    test(format + " exact roundtrip " + JSON.stringify(value), () => {
      const result = decodeBinary(format, encodeBinary(format, value));
      assert.deepEqual(result, value);
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
      assert.equal(result.x, undefined);
    });
  test(format + " rejects inexact conversions", () =>
    assert.throws(() =>
      encodeBinary(format, parseJson('{"id":9007199254740993}')),
    ),
  );
  test(format + " rejects trailing data", () => {
    const data = encodeBinary(format, {});
    assert.throws(() => decodeBinary(format, new Uint8Array([...data, 0])));
  });
}
test("BSON rejects non-document roots", () => {
  for (const v of [42, null, [1]]) assert.throws(() => encodeBinary("bson", v));
});
test("CBOR float16 consumes exactly two bytes", () => {
  assert.equal(decodeBinary("cbor", new Uint8Array([0xf9, 0x3e, 0])), 1.5);
  assert.deepEqual(
    decodeBinary("cbor", new Uint8Array([0x82, 0xf9, 0x3e, 0, 1])),
    [1.5, 1],
  );
});
for (const [f, b] of [
  ["cbor", [0x65, 0x61]],
  ["msgpack", [0xa5, 0x61]],
  ["bson", [5, 0, 0, 0]],
])
  test(f + " rejects truncated input", () =>
    assert.throws(() => decodeBinary(f, new Uint8Array(b))),
  );

test("lossless JSON duplicate keys follow native last-key-wins semantics", () =>
  assert.equal(stringifyJson(parseJson('{"a":1,"a":2}')), '{"a":2}'));
test("YAML refuses rounding and non-finite decimals", () => {
  assert.throws(() => parseYaml("x: 1.234567890123456789"));
  assert.throws(() => parseYaml("x: .inf"));
  assert.equal(stringifyJson(parseYaml("x: -.5")), '{"x":-0.5}');
});

for (const [value, multiple, valid] of [
  [0.3, 0.1, true],
  [0.3000000000001, 0.1, false],
  [4e-8, 1e-8, true],
]) {
  test("schema decimal multipleOf " + value + "/" + multiple, () =>
    assert.equal(
      validateSchema(value, { multipleOf: multiple }).errors.length === 0,
      valid,
    ),
  );
}
