import Ajv2020 from "ajv/dist/2020.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  assertNativeNumbers,
  isLosslessNumber,
  jsonType,
  normalizeNumber,
} from "./json.js";

function decimalMultiple(divisor, value) {
  if (value === 0) return true;
  const [a, ae] = normalizeNumber(String(value)).split("e");
  const [b, be] = normalizeNumber(String(divisor)).split("e");
  const delta = BigInt(ae) - BigInt(be);
  return delta >= 0n
    ? (BigInt(a) * 10n ** delta) % BigInt(b) === 0n
    : BigInt(a) % (BigInt(b) * 10n ** -delta) === 0n;
}
const DIALECTS = new Map([
  [
    "http://json-schema.org/draft-07/schema",
    "http://json-schema.org/draft-07/schema#",
  ],
  [
    "https://json-schema.org/draft-07/schema",
    "http://json-schema.org/draft-07/schema#",
  ],
  [
    "https://json-schema.org/draft/2020-12/schema",
    "https://json-schema.org/draft/2020-12/schema",
  ],
]);
const validators = new Map();
function validatorFor(schema) {
  const key = JSON.stringify(schema);
  if (validators.has(key)) return validators.get(key);
  const declared = schema?.$schema;
  // Ajv registers each meta-schema under one URI; accept the common spellings.
  const dialect = declared && DIALECTS.get(String(declared).replace(/#$/, ""));
  if (declared && !dialect)
    throw new Error("Supported JSON Schema dialects: draft-07 and 2020-12");
  const warnings = new Set();
  const ajv = new (dialect?.includes("draft-07") ? Ajv : Ajv2020)({
    // Unknown keywords (example, x-*) are common in real schemas: validate the
    // rest and report what was ignored instead of refusing the whole schema.
    strictSchema: "log",
    strictTypes: false,
    strictTuples: false,
    strictRequired: false,
    ownProperties: true,
    validateFormats: true,
    allErrors: false,
    logger: {
      log() {},
      warn: (...parts) => warnings.add(parts.join(" ")),
      error: (...parts) => warnings.add(parts.join(" ")),
    },
  });
  // JSON decimals are rational values. Floating-point division would reject
  // 0.3 / 0.1; an epsilon would accept values that are merely close to a multiple.
  ajv.removeKeyword("multipleOf");
  ajv.addKeyword({
    keyword: "multipleOf",
    type: "number",
    schemaType: "number",
    errors: false,
    metaSchema: { type: "number", exclusiveMinimum: 0 },
    validate: decimalMultiple,
  });
  addFormats(ajv);
  const validate = ajv.compile(
    dialect && dialect !== declared ? { ...schema, $schema: dialect } : schema,
  );
  const entry = { validate, warnings: describeWarnings(warnings) };
  if (validators.size >= 8) validators.delete(validators.keys().next().value);
  validators.set(key, entry);
  return entry;
}
function describeWarnings(messages) {
  const unknown = [],
    other = [];
  for (const message of messages) {
    const m = /unknown keyword: "(.*)"/.exec(message);
    if (m) unknown.push(m[1]);
    else other.push(message);
  }
  return [
    ...(unknown.length
      ? ["Ignored unknown keywords: " + [...new Set(unknown)].join(", ")]
      : []),
    ...other,
  ];
}
function isIntegerLiteral(raw) {
  return BigInt(normalizeNumber(raw).split("e")[1]) >= 0n;
}
// Integers beyond 2^53 (typically IDs) keep their JSON type when rounded to a
// double; only value comparisons could change, and those are refused below.
function approximateIntegers(value) {
  let approximated = false;
  const approximate = (v) => {
    const n = Number(v.value);
    if (!Number.isFinite(n) || !isIntegerLiteral(v.value))
      throw new Error(
        "This operation cannot represent the number " + v.value + " exactly",
      );
    approximated = true;
    return n;
  };
  if (isLosslessNumber(value)) value = approximate(value);
  const stack = [value];
  while (stack.length) {
    const v = stack.pop();
    if (!v || typeof v !== "object") continue;
    for (const key of Object.keys(v)) {
      if (isLosslessNumber(v[key]))
        Object.defineProperty(v, key, {
          value: approximate(v[key]),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      else stack.push(v[key]);
    }
  }
  return { value, approximated };
}
const NUMERIC_KEYWORDS = new Set([
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
]);
function containsNumber(value) {
  const stack = [value];
  while (stack.length) {
    const v = stack.pop();
    if (typeof v === "number") return true;
    if (v && typeof v === "object")
      for (const k of Object.keys(v)) stack.push(v[k]);
  }
  return false;
}
// Conservative: any keyword that compares numeric values anywhere in the schema.
function comparesNumbers(schema) {
  const stack = [schema];
  while (stack.length) {
    const s = stack.pop();
    if (!s || typeof s !== "object") continue;
    for (const key of Object.keys(s)) {
      if (
        NUMERIC_KEYWORDS.has(key) ||
        (key === "uniqueItems" && s[key] === true) ||
        ((key === "enum" || key === "const") && containsNumber(s[key]))
      )
        return true;
      stack.push(s[key]);
    }
  }
  return false;
}
export function validateSchema(input, schema) {
  assertNativeNumbers(schema);
  const { validate, warnings } = validatorFor(schema);
  const { value, approximated } = approximateIntegers(input);
  if (approximated && comparesNumbers(schema))
    throw new Error(
      "The document contains integers beyond ±2^53, and this schema compares " +
        "numeric values that cannot be checked exactly",
    );
  const errors = validate(value)
    ? []
    : validate.errors
        .slice(0, 50)
        .map((e) => ({ path: e.instancePath, message: e.message }));
  return { errors, warnings };
}
export function generateSchema(value, depth = 0) {
  if (depth > 256)
    throw new Error("Schema generation supports nesting up to 256 levels");
  const type = jsonType(value);
  if (type === "number")
    return {
      type: (
        isLosslessNumber(value)
          ? isIntegerLiteral(value.value)
          : Number.isInteger(value)
      )
        ? "integer"
        : "number",
    };
  if (type === "array") {
    const unique = new Map();
    for (const item of value) {
      const s = generateSchema(item, depth + 1);
      unique.set(JSON.stringify(s), s);
    }
    const variants = [...unique.values()];
    return {
      type: "array",
      items:
        variants.length === 0
          ? {}
          : variants.length === 1
            ? variants[0]
            : { anyOf: variants },
    };
  }
  if (type === "object") {
    const properties = Object.create(null),
      required = Object.keys(value);
    for (const key of required)
      properties[key] = generateSchema(value[key], depth + 1);
    return { type, properties, required };
  }
  return { type };
}
