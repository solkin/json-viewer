import { build } from "esbuild";
import { rm, readFile, writeFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
await rm("assets", { recursive: true, force: true });
const result = await build({
  entryPoints: { app: "app.js", worker: "src/worker.js" },
  bundle: true,
  splitting: true,
  format: "esm",
  outdir: "assets",
  minify: true,
  target: "es2022",
  legalComments: "linked",
  metafile: true,
});
// Ship the licenses of the code actually included in the self-hosted bundles.
const packages = new Set(
  Object.keys(result.metafile.inputs)
    .filter((p) => p.startsWith("node_modules/"))
    .map((p) => {
      const parts = p.split("/");
      return parts.slice(0, parts[1].startsWith("@") ? 3 : 2).join("/");
    }),
);
const notices = [];
for (const directory of [...packages].sort()) {
  const pkg = JSON.parse(await readFile(directory + "/package.json", "utf8"));
  const files = (await readdir(directory)).filter((name) =>
    /^licen[sc]e/i.test(name),
  );
  notices.push(pkg.name + " " + pkg.version + " (" + pkg.license + ")");
  for (const file of files)
    notices.push(await readFile(directory + "/" + file, "utf8"));
}
await writeFile("assets/THIRD_PARTY_NOTICES.txt", notices.join("\n\n"));
// Chunks are content-hashed, but the entries keep stable names so the page can
// reference them. Version those URLs: a cached entry must never outlive the
// chunks it imports. esbuild already folds imported chunk hashes into chunk
// names, so hashing an entry's bytes covers everything it loads.
const version = (content) =>
  createHash("sha256").update(content).digest("hex").slice(0, 12);
const worker = await readFile("assets/worker.js");
const app = (await readFile("assets/app.js", "utf8")).split('"./worker.js"');
if (app.length !== 2)
  throw new Error("Expected exactly one worker URL in assets/app.js");
const appContent = app.join('"./worker.js?v=' + version(worker) + '"');
await writeFile("assets/app.js", appContent);
const page = await readFile("index.php", "utf8");
const script = /src="assets\/app\.js(?:\?v=[0-9a-f]*)?"/g;
if (page.match(script)?.length !== 1)
  throw new Error("Expected exactly one assets/app.js script in index.php");
await writeFile(
  "index.php",
  page.replace(script, 'src="assets/app.js?v=' + version(appContent) + '"'),
);
for (const file of Object.keys(result.metafile.outputs).filter((p) =>
  p.endsWith(".js"),
)) {
  const content = await readFile(file);
  console.log(
    file +
      ": " +
      content.length +
      " bytes, " +
      gzipSync(content).length +
      " gzip",
  );
}
