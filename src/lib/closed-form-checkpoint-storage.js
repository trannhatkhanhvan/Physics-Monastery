// Durable storage for Closed-Forms Full Run checkpoints.
// Complete equivalence reserves are retained without relying
// on the small localStorage quota.

const DATABASE = 'physics-monastery-closed-forms';
const STORE = 'full-run-checkpoints';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(Error('IndexedDB is unavailable.'));
      return;
    }

    const request = indexedDB.open(DATABASE, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      request.error || Error('Cannot open checkpoint database.')
    );
    request.onblocked = () => reject(
      Error('Checkpoint database upgrade was blocked.')
    );
  });
}

async function transact(key, operation, value) {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      let transaction;
      let request;

      try {
        transaction = database.transaction(
          STORE,
          operation === 'get' ? 'readonly' : 'readwrite'
        );

        const store = transaction.objectStore(STORE);

        request = operation === 'get'
          ? store.get(key)
          : operation === 'put'
            ? store.put(value, key)
            : store.delete(key);
      } catch (error) {
        reject(error);
        return;
      }

      let result = null;

      request.onsuccess = () => {
        result = request.result ?? null;
      };

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(
        transaction.error ||
        Error('Checkpoint transaction failed.')
      );
      transaction.onabort = () => reject(
        transaction.error ||
        Error('Checkpoint transaction aborted.')
      );
    });
  } finally {
    database.close();
  }
}

export async function loadFullCheckpoint(key) {
  const stored = await transact(key, 'get');
  if (stored !== null) return stored;

  const legacy = localStorage.getItem(key);
  if (!legacy) return null;

  const checkpoint = JSON.parse(legacy);

  await saveFullCheckpoint(key, checkpoint);
  localStorage.removeItem(key);

  return checkpoint;
}

export function saveFullCheckpoint(key, checkpoint) {
  return transact(key, 'put', checkpoint);
}

export async function deleteFullCheckpoint(key) {
  await transact(key, 'delete');
  localStorage.removeItem(key);
}
