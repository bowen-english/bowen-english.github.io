const DB_NAME = "english-shadow-coach-audio";
const DB_VERSION = 2;
const STORE_NAME = "assistant-audio";
const LAST_ACCESSED_INDEX = "lastAccessedAt";
const MAX_CACHE_BYTES = 75 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 200;

type CachedAudioRecord = {
  key: string;
  blob: Blob;
  createdAt: string;
  lastAccessedAt: string;
  size: number;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openAudioCache() {
  return new Promise<IDBDatabase | null>((resolve, reject) => {
    if (!canUseIndexedDb()) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction?.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: "key" });

      if (store && !store.indexNames.contains(LAST_ACCESSED_INDEX)) {
        store.createIndex(LAST_ACCESSED_INDEX, LAST_ACCESSED_INDEX);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function closeWithError(
  db: IDBDatabase,
  reject: (reason?: unknown) => void,
  error: unknown,
) {
  db.close();
  reject(error);
}

export async function getCachedAudioBlob(key: string) {
  const db = await openAudioCache();

  if (!db) {
    return null;
  }

  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    let blob: Blob | null = null;

    request.onsuccess = () => {
      const record = request.result as Partial<CachedAudioRecord> | undefined;

      if (record?.blob instanceof Blob) {
        blob = record.blob;
        const now = new Date().toISOString();
        store.put({
          key,
          blob,
          createdAt: record.createdAt ?? now,
          lastAccessedAt: now,
          size: record.size ?? blob.size,
        } satisfies CachedAudioRecord);
      }
    };
    transaction.oncomplete = () => {
      db.close();
      resolve(blob);
    };
    transaction.onerror = () =>
      closeWithError(db, reject, transaction.error);
    transaction.onabort = () => closeWithError(db, reject, transaction.error);
  });
}

export async function putCachedAudioBlob(key: string, blob: Blob) {
  const db = await openAudioCache();

  if (!db) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const now = new Date().toISOString();

    store.put({
      key,
      blob,
      createdAt: now,
      lastAccessedAt: now,
      size: blob.size,
    } satisfies CachedAudioRecord);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () =>
      closeWithError(db, reject, transaction.error);
    transaction.onabort = () => closeWithError(db, reject, transaction.error);
  });

  await pruneAudioCache();
}

export async function deleteCachedAudioByMessageIds(messageIds: Iterable<string>) {
  const ids = new Set(messageIds);

  if (ids.size === 0) {
    return;
  }

  const db = await openAudioCache();

  if (!db) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        return;
      }

      const key = String(cursor.primaryKey);
      const messageId = key.startsWith("assistant-audio:")
        ? key.slice("assistant-audio:".length).split(":", 1)[0]
        : "";

      if (ids.has(messageId)) {
        cursor.delete();
      }

      cursor.continue();
    };
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () =>
      closeWithError(db, reject, transaction.error);
    transaction.onabort = () => closeWithError(db, reject, transaction.error);
  });
}

export async function pruneAudioCache({
  maxBytes = MAX_CACHE_BYTES,
  maxEntries = MAX_CACHE_ENTRIES,
}: {
  maxBytes?: number;
  maxEntries?: number;
} = {}) {
  const db = await openAudioCache();

  if (!db) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = (request.result as Partial<CachedAudioRecord>[])
        .filter(
          (record): record is Partial<CachedAudioRecord> & { key: string } =>
            typeof record.key === "string",
        )
        .sort((left, right) =>
          (left.lastAccessedAt ?? left.createdAt ?? "").localeCompare(
            right.lastAccessedAt ?? right.createdAt ?? "",
          ),
        );
      let totalBytes = records.reduce(
        (total, record) => total + (record.size ?? record.blob?.size ?? 0),
        0,
      );
      let remainingEntries = records.length;

      for (const record of records) {
        if (remainingEntries <= maxEntries && totalBytes <= maxBytes) {
          break;
        }

        store.delete(record.key);
        totalBytes -= record.size ?? record.blob?.size ?? 0;
        remainingEntries -= 1;
      }
    };
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () =>
      closeWithError(db, reject, transaction.error);
    transaction.onabort = () => closeWithError(db, reject, transaction.error);
  });
}
