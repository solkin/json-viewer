import {
  jsonType as getType,
  jsonType,
  isLosslessNumber,
  normalizeNumber,
  stringifyJson,
  parseJson,
} from "./json.js";
const COMPARE_MAX_DIFFS = 500;
function jsonValueType(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return jsonType(value);
}

function formatJsonPath(parts) {
  if (!parts.length) {
    return "$";
  }
  let s = "$";
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (typeof p === "number") {
      s += "[" + p + "]";
    } else if (/^[a-zA-Z_$][\w$]*$/.test(p)) {
      s += "." + p;
    } else {
      s += "[" + stringifyJson(p) + "]";
    }
  }
  return s;
}

function sameJsonPrimitive(a, b) {
  return getType(a) === "number"
    ? normalizeNumber(isLosslessNumber(a) ? a.value : String(a)) ===
        normalizeNumber(isLosslessNumber(b) ? b.value : String(b))
    : Object.is(a, b);
}

function compareJsonValues(a, b, pathParts, out) {
  if (out.length >= COMPARE_MAX_DIFFS) {
    return;
  }
  const ta = jsonValueType(a);
  const tb = jsonValueType(b);
  if (ta !== tb) {
    out.push({
      kind: "type",
      path: formatJsonPath(pathParts),
      leftType: ta,
      rightType: tb,
      leftVal: a,
      rightVal: b,
    });
    return;
  }
  if (ta === "null") {
    return;
  }
  if (ta === "number" || ta === "boolean" || ta === "string") {
    if (!sameJsonPrimitive(a, b)) {
      out.push({
        kind: "value",
        path: formatJsonPath(pathParts),
        leftVal: a,
        rightVal: b,
      });
    }
    return;
  }
  if (ta === "array") {
    if (a.length !== b.length) {
      out.push({
        kind: "length",
        path: formatJsonPath(pathParts),
        left: a.length,
        right: b.length,
      });
    }
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      compareJsonValues(a[i], b[i], pathParts.concat(i), out);
      if (out.length >= COMPARE_MAX_DIFFS) {
        return;
      }
    }
    for (let i = n; i < a.length; i++) {
      if (out.length >= COMPARE_MAX_DIFFS) {
        return;
      }
      out.push({
        kind: "only_left",
        path: formatJsonPath(pathParts.concat(i)),
        leftVal: a[i],
      });
    }
    for (let i = n; i < b.length; i++) {
      if (out.length >= COMPARE_MAX_DIFFS) {
        return;
      }
      out.push({
        kind: "only_right",
        path: formatJsonPath(pathParts.concat(i)),
        rightVal: b[i],
      });
    }
    return;
  }
  // object
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  const setB = new Set(keysB);
  const setA = new Set(keysA);
  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i];
    if (!setB.has(k)) {
      if (out.length >= COMPARE_MAX_DIFFS) {
        return;
      }
      out.push({
        kind: "only_left",
        path: formatJsonPath(pathParts.concat(k)),
        leftVal: a[k],
      });
    }
  }
  for (let i = 0; i < keysB.length; i++) {
    const k = keysB[i];
    if (!setA.has(k)) {
      if (out.length >= COMPARE_MAX_DIFFS) {
        return;
      }
      out.push({
        kind: "only_right",
        path: formatJsonPath(pathParts.concat(k)),
        rightVal: b[k],
      });
    }
  }
  const common = keysA.filter((k) => setB.has(k));
  common.sort();
  for (let i = 0; i < common.length; i++) {
    const k = common[i];
    compareJsonValues(a[k], b[k], pathParts.concat(k), out);
    if (out.length >= COMPARE_MAX_DIFFS) {
      return;
    }
  }
}

function preview(value, depth = 0) {
  if (depth > 3) return "…";
  if (typeof value === "string")
    return (
      JSON.stringify(value.slice(0, 240)) + (value.length > 240 ? "…" : "")
    );
  if (!value || typeof value !== "object" || isLosslessNumber(value))
    return stringifyJson(value);
  const keys = Object.keys(value),
    array = Array.isArray(value);
  return (
    (array ? "[" : "{") +
    keys
      .slice(0, 6)
      .map(
        (k) =>
          (array ? "" : JSON.stringify(k) + ":") + preview(value[k], depth + 1),
      )
      .join(",") +
    (keys.length > 6 ? ",…" : "") +
    (array ? "]" : "}")
  );
}
export function compareDocuments(a, b) {
  let left, right;
  try {
    left = parseJson(a);
  } catch (e) {
    throw new Error("JSON A: " + e.message);
  }
  try {
    right = parseJson(b);
  } catch (e) {
    throw new Error("JSON B: " + e.message);
  }
  const out = [];
  compareJsonValues(left, right, [], out);
  for (const item of out) {
    for (const side of ["left", "right"]) {
      const key = side + "Val";
      if (Object.hasOwn(item, key)) {
        item[side + "Preview"] = preview(item[key]).slice(0, 500);
        delete item[key];
      }
    }
  }
  return out;
}
