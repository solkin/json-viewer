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
const validators = new Map();
function validatorFor(schema) {
  const key = JSON.stringify(schema);
  if (validators.has(key)) return validators.get(key);
  const dialect = schema?.$schema;
  if (
    dialect &&
    ![
      "http://json-schema.org/draft-07/schema#",
      "https://json-schema.org/draft-07/schema",
      "https://json-schema.org/draft/2020-12/schema",
    ].includes(dialect)
  ) {
    throw new Error("Supported JSON Schema dialects: draft-07 and 2020-12");
  }
  const ajv = new (dialect?.includes("draft-07") ? Ajv : Ajv2020)({
    strictSchema: true,
    strictTypes: false,
    strictTuples: false,
    strictRequired: false,
    ownProperties: true,
    validateFormats: true,
    allErrors: false,
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
  const validate = ajv.compile(schema);
  if (validators.size >= 8) validators.delete(validators.keys().next().value);
  validators.set(key, validate);
  return validate;
}
export function validateSchema(value, schema) {
  assertNativeNumbers(value);
  assertNativeNumbers(schema);
  const validate = validatorFor(schema);
  return validate(value)
    ? []
    : validate.errors
        .slice(0, 50)
        .map((e) => ({ path: e.instancePath, message: e.message }));
}
export function generateSchema(value, depth = 0) {
  if (depth > 256)
    throw new Error("Schema generation supports nesting up to 256 levels");
  const type = jsonType(value);
  if (type === "number")
    return {
      type: isLosslessNumber(value)
        ? "number"
        : Number.isInteger(value)
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
