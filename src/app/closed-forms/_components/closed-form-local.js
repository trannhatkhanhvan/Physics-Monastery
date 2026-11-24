// Browser-local Closed-Form Explorer engine.
// No numerical search requests are sent to Vercel.

let worker = null;
let nextId = 0;

const pending = new Map();

// Safety limit per computation batch.
const MAX_BATCH_MS = 45000;

function resetWorker(error) {
  if (worker) {
    worker.terminate();
  }

  worker = null;

  for (const item of pending.values()) {
    clearTimeout(item.timeout);

    item.signal?.removeEventListener(
      'abort',
      item.onAbort
    );

    item.reject(error);
  }

  pending.clear();
}

function getWorker() {
  if (worker) return worker;

  worker = new Worker(
    new URL('./closed-form.worker.js', import.meta.url)
  );

  worker.onmessage = ({ data }) => {
    const item = pending.get(data.id);

    if (!item) return;

    pending.delete(data.id);
    clearTimeout(item.timeout);

    item.signal?.removeEventListener(
      'abort',
      item.onAbort
    );

    item.resolve({
      ok: data.ok,
      status: data.status,
      json: async () => data.data
    });
  };

  worker.onerror = () => {
    resetWorker(
      new Error('The local computation worker failed')
    );
  };

  return worker;
}

export function localClosedFormRequest(
  input,
  constants,
  signal
) {
  if (signal?.aborted) {
    return Promise.reject(
      new DOMException(
        'Search cancelled',
        'AbortError'
      )
    );
  }

  return new Promise((resolve, reject) => {
    const id = ++nextId;

    const onAbort = () => {
      resetWorker(
        new DOMException(
          'Search cancelled',
          'AbortError'
        )
      );
    };

    const timeout = setTimeout(() => {
      resetWorker(
        new Error(
          'Local computation exceeded the ' +
          '45-second per-batch limit'
        )
      );
    }, MAX_BATCH_MS);

    pending.set(id, {
      resolve,
      reject,
      timeout,
      signal,
      onAbort
    });

    signal?.addEventListener(
      'abort',
      onAbort,
      { once: true }
    );

    try {
      getWorker().postMessage({
        id,
        input,
        constants
      });
    } catch (error) {
      resetWorker(error);
    }
  });
}
