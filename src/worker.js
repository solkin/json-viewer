import { analyzeDocument } from "./json.js";
self.onmessage = async ({ data: { id, task, args } }) => {
  try {
    const result =
      task === "parse"
        ? analyzeDocument(args.text)
        : await (await import("./tools.js")).runTask(task, args);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
