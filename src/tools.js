import { parseJson, stringifyJson, formatJsonText } from "./json.js";
import { compareDocuments } from "./diff.js";

export async function runTask(task, args) {
  if (task === "compare") return compareDocuments(args.a, args.b);
  if (task === "format") return formatJsonText(args.text, args.pretty);
  if (task === "schema")
    return (await import("./schema.js")).validateSchema(
      parseJson(args.text),
      parseJson(args.schema),
    );
  if (task === "generate")
    return {
      ...(await import("./schema.js")).generateSchema(parseJson(args.text)),
      $schema: "https://json-schema.org/draft/2020-12/schema",
    };
  if (task === "yamlEncode")
    return (await import("./yaml.js")).stringifyYaml(parseJson(args.text));
  if (task === "yamlDecode")
    return stringifyJson(
      (await import("./yaml.js")).parseYaml(args.text),
      null,
      2,
    );
  if (task === "encode")
    return (await import("./binary.js")).encodeBinary(
      args.format,
      parseJson(args.text),
    );
  if (task === "decode")
    return stringifyJson(
      (await import("./binary.js")).decodeBinary(args.format, args.bytes),
      null,
      2,
    );
  throw new Error("Unknown task");
}
