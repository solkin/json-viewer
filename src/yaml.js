import * as Yaml from "yaml";
import { assertNativeNumbers, normalizeNumber } from "./json.js";
import { checkJsonValue } from "./value.js";

export function parseYaml(text) {
  const docs = Yaml.parseAllDocuments(text, {
    version: "1.2",
    merge: true,
    intAsBigInt: true,
    uniqueKeys: true,
    stringKeys: true,
  });
  const result = docs.map((doc) => {
    Yaml.visit(doc, {
      Scalar(_, node) {
        if (typeof node.value === "number") {
          if (!Number.isFinite(node.value))
            throw new Error("Non-finite numbers cannot be represented in JSON");
          const raw = node.source
            ?.replaceAll("_", "")
            .replace(/^\+/, "")
            .replace(/^(-?)\./, "$10.")
            .replace(/\.(?=[eE]|$)/, ".0");
          if (
            raw &&
            normalizeNumber(raw) !== normalizeNumber(String(node.value))
          )
            throw new Error(
              "YAML number cannot be converted exactly: " + node.source,
            );
        }
      },
    });
    if (doc.errors.length) throw doc.errors[0];
    if (doc.warnings.length) throw doc.warnings[0];
    return checkJsonValue(doc.toJS({ maxAliasCount: 100 }));
  });
  return result.length === 0 ? null : result.length === 1 ? result[0] : result;
}
export function stringifyYaml(value) {
  // YAML's native number model cannot encode arbitrary precision decimal literals.
  assertNativeNumbers(value);
  return Yaml.stringify(value, { version: "1.2", lineWidth: 0 });
}
