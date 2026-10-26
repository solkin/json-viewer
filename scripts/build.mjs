import { build } from "esbuild";
import { rm, readFile, writeFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
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
