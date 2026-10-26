// One operation runs at a time, so its time budget measures its own work rather
// than the queue ahead of it.
const TIME_BUDGET = 15000;
let worker;
let nextId = 0;
let running = null;
const queue = [];

export class CancelledError extends Error {
  constructor() {
    super("Superseded by a newer operation");
    this.name = "CancelledError";
  }
}
export const isCancelled = (error) => error instanceof CancelledError;

// Tasks sharing a `key` describe the same view of the document: a newer one
// replaces an older one that is queued or still running, and an identical
// request joins the one already in progress.
export function task(name, args, key) {
  if (key) {
    for (const job of [running, ...queue]) {
      if (job?.key === key && job.name === name && sameArgs(job.args, args))
        return job.promise;
    }
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].key === key)
        queue.splice(i, 1)[0].reject(new CancelledError());
    }
    if (running?.key === key) stop(new CancelledError());
  }
  const job = { id: ++nextId, name, args, key };
  job.promise = new Promise((resolve, reject) => {
    job.resolve = resolve;
    job.reject = reject;
  });
  queue.push(job);
  pump();
  return job.promise;
}

function sameArgs(a, b) {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
}

function pump() {
  if (running || !queue.length) return;
  if (!worker) {
    worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (data.id !== running?.id) return;
      const job = finish();
      data.error ? job.reject(new Error(data.error)) : job.resolve(data.result);
      pump();
    };
    worker.onerror = (event) => {
      event.preventDefault?.();
      stop(new Error("Document worker failed"));
    };
  }
  running = queue.shift();
  // A user-supplied schema may contain an expensive regular expression.
  running.timer = setTimeout(
    () =>
      stop(
        new Error(
          "Operation exceeded its " +
            TIME_BUDGET / 1000 +
            "-second time budget",
        ),
      ),
    TIME_BUDGET,
  );
  worker.postMessage({
    id: running.id,
    task: running.name,
    args: running.args,
  });
}

function finish() {
  const job = running;
  clearTimeout(job.timer);
  running = null;
  return job;
}

// The running operation cannot be interrupted in place: replace the worker.
// Queued operations are kept and run on the new one.
function stop(error) {
  worker?.terminate();
  worker = undefined;
  if (running) finish().reject(error);
  pump();
}
