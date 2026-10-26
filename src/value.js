import { isLosslessNumber } from "./json.js";

export function checkJsonValue(value) {
  const stack = [{ value, depth: 0, ancestors: new Set() }];
  let count = 0;
  while (stack.length) {
    const { value: v, depth, ancestors } = stack.pop();
    if (++count > 1000000 || depth > 256)
      throw new Error("Converted document exceeds the node or nesting budget");
    if (typeof v === "number" && !Number.isFinite(v))
      throw new Error("Non-finite numbers cannot be represented in JSON");
    if (v === undefined || typeof v === "function" || typeof v === "symbol")
      throw new Error("Value cannot be represented in JSON");
    if (v && typeof v === "object" && !isLosslessNumber(v)) {
      if (ancestors.has(v))
        throw new Error("Circular aliases cannot be represented in JSON");
      if (
        !Array.isArray(v) &&
        Object.getPrototypeOf(v) !== Object.prototype &&
        Object.getPrototypeOf(v) !== null
      )
        throw new Error("Non-JSON object type");
      const next = new Set(ancestors);
      next.add(v);
      for (const key of Object.keys(v))
        stack.push({ value: v[key], depth: depth + 1, ancestors: next });
    }
  }
  return value;
}
