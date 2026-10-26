let worker;
let nextId = 0;
const pending = new Map();
export function task(name, args) {
  if (!worker) {
    worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      pending.delete(data.id);
      clearTimeout(job.timer);
      data.error ? job.reject(new Error(data.error)) : job.resolve(data.result);
    };
    worker.onerror = () => reset(new Error("Document worker failed"));
  }
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    // A user-supplied schema may contain an expensive regular expression.
    const timer = setTimeout(
      () => reset(new Error("Operation exceeded its time budget")),
      15000,
    );
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ id, task: name, args });
  });
}
function reset(error) {
  worker?.terminate();
  worker = undefined;
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(error);
  }
  pending.clear();
}
