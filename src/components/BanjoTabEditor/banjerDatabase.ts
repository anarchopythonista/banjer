export const DATABASE_NAME = "banjer";
export const DATABASE_VERSION = 2;
export const TAB_STORE_NAME = "tabs";
export const PREFERENCES_STORE_NAME = "preferences";

export function openBanjerDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(TAB_STORE_NAME)) {
        const store = database.createObjectStore(TAB_STORE_NAME, {
          keyPath: "id",
        });
        store.createIndex("lastOpenedAt", "lastOpenedAt");
        store.createIndex("updatedAt", "updatedAt");
      }

      if (!database.objectStoreNames.contains(PREFERENCES_STORE_NAME)) {
        database.createObjectStore(PREFERENCES_STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open Banjer database"));
  });
}
