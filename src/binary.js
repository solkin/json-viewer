import { serialize, deserialize } from "bson";
import { Packr, Unpackr } from "msgpackr";
import { encode as encodeCBOR, decode as decodeCBOR } from "cborg";
import { assertNativeNumbers } from "./json.js";
import { checkJsonValue } from "./value.js";

const packr = new Packr({
  useRecords: false,
  mapsAsObjects: true,
  structuredClone: false,
});
const unpackr = new Unpackr({ mapsAsObjects: false, int64AsType: "bigint" });
export function encodeBinary(format, value) {
  assertNativeNumbers(value);
  checkJsonValue(value);
  if (format === "bson") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("A BSON document must have an object at its root");
    return new Uint8Array(serialize(value, { checkKeys: false }));
  }
  if (format === "msgpack") return new Uint8Array(packr.pack(value));
  if (format === "cbor") return encodeCBOR(value);
  throw new Error("Unknown binary format");
}
function mapsToObjects(value) {
  if (value instanceof Map) {
    const out = {};
    for (const [key, v] of value) {
      if (typeof key !== "string")
        throw new Error("JSON object keys must be strings");
      Object.defineProperty(out, key, {
        value: mapsToObjects(v),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return out;
  }
  if (Array.isArray(value)) return value.map(mapsToObjects);
  return value;
}
export function decodeBinary(format, input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let value;
  if (format === "bson") value = deserialize(bytes, { useBigInt64: true });
  else if (format === "msgpack") value = mapsToObjects(unpackr.unpack(bytes));
  else if (format === "cbor")
    value = decodeCBOR(bytes, {
      allowUndefined: false,
      allowNaN: false,
      allowInfinity: false,
      rejectDuplicateMapKeys: true,
    });
  else throw new Error("Unknown binary format");
  return checkJsonValue(value);
}
