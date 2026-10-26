import {
  parse,
  stringify,
  isLosslessNumber,
  LosslessNumber,
} from "lossless-json";

export { isLosslessNumber };
export const stringifyJson = stringify;
// Keep ordinary numbers native; retain only literals that cannot round-trip exactly.
export function parseJson(text) {
  return parse(text, undefined, {
    onDuplicateKey: ({ newValue }) => newValue,
    parseNumber: (raw) => {
      const value = Number(raw);
      return Number.isFinite(value) &&
        normalizeNumber(String(value)) === normalizeNumber(raw)
        ? value
        : new LosslessNumber(raw);
    },
  });
}
export function normalizeNumber(raw) {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!m) throw new Error("Invalid JSON number");
  let digits = (m[2] + (m[3] || "")).replace(/^0+/, "");
  if (!digits) return "0";
  let exponent = BigInt(m[4] || 0) - BigInt((m[3] || "").length);
  const trailing = digits.match(/0+$/)?.[0].length || 0;
  digits = digits.slice(0, digits.length - trailing);
  exponent += BigInt(trailing);
  return m[1] + digits + "e" + exponent;
}
export function jsonType(value) {
  if (value === null) return "null";
  if (isLosslessNumber(value)) return "number";
  return Array.isArray(value) ? "array" : typeof value;
}
export function assertNativeNumbers(value) {
  const stack = [value];
  while (stack.length) {
    const v = stack.pop();
    if (isLosslessNumber(v))
      throw new Error(
        "This operation cannot represent the number " + v.value + " exactly",
      );
    if (v && typeof v === "object")
      for (const k of Object.keys(v)) stack.push(v[k]);
  }
  return value;
}
// Formatting edits lexical tokens without interpreting them as JS numbers.
export function* tokens(text) {
  const re =
    /"(?:[^"\\\x00-\x1f]|\\[\s\S])*(?:"|$)|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\]:,]|[\t\r\n ]+|[^\s]/gy;
  let m;
  while ((m = re.exec(text))) yield { raw: m[0], offset: m.index };
}
export function formatJsonText(text, pretty = true) {
  JSON.parse(text); // Grammar check only; the returned numeric values are discarded.
  const list = [...tokens(text)].filter((t) => !/^\s+$/.test(t.raw));
  const out = [];
  let depth = 0;
  for (let i = 0; i < list.length; i++) {
    const t = list[i].raw,
      previous = list[i - 1]?.raw,
      next = list[i + 1]?.raw;
    if (t === "{" || t === "[") {
      out.push(t);
      depth++;
      if (pretty && next !== "}" && next !== "]")
        out.push("\n", "  ".repeat(depth));
    } else if (t === "}" || t === "]") {
      depth--;
      if (pretty && previous !== "{" && previous !== "[")
        out.push("\n", "  ".repeat(depth));
      out.push(t);
    } else if (t === ",") out.push(pretty ? ",\n" + "  ".repeat(depth) : ",");
    else if (t === ":") out.push(pretty ? ": " : ":");
    else out.push(t);
  }
  return out.join("");
}
export function analyzeDocument(text) {
  const value = parseJson(text),
    numbers = [];
  let count = 0;
  const stack = [{ value, path: [] }];
  while (stack.length) {
    const entry = stack.pop();
    count++;
    if (isLosslessNumber(entry.value))
      numbers.push({ path: entry.path, raw: entry.value.value });
    else if (entry.value && typeof entry.value === "object")
      for (const key of Object.keys(entry.value))
        stack.push({ value: entry.value[key], path: [...entry.path, key] });
  }
  return { value, count, numbers };
}
export function reviveParsed(value, numbers) {
  for (const { path, raw } of numbers) {
    if (!path.length) value = new LosslessNumber(raw);
    else {
      let parent = value;
      for (const key of path.slice(0, -1)) parent = parent[key];
      Object.defineProperty(parent, path.at(-1), {
        value: new LosslessNumber(raw),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  return value;
}
