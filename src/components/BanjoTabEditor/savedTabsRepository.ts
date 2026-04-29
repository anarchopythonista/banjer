import type {
  BanjoTabDocument,
  SavedTabRecord,
  SavedTabSummary,
} from "./types";

const DATABASE_NAME = "banjer";
const DATABASE_VERSION = 1;
const TAB_STORE_NAME = "tabs";

export async function listSavedTabs(): Promise<SavedTabSummary[]> {
  const database = await openSavedTabsDatabase();
  const records = await getAllRecords(database);
  database.close();
  return sortSavedTabSummaries(
    records.map((record) => toSavedTabSummary(fromSavedTabRecord(record))),
  );
}

export async function getMostRecentTab(): Promise<BanjoTabDocument | null> {
  const database = await openSavedTabsDatabase();
  const records = await getAllRecords(database);
  database.close();
  const [mostRecentRecord] = [...records].sort((first, second) =>
    second.lastOpenedAt.localeCompare(first.lastOpenedAt),
  );
  return mostRecentRecord ? fromSavedTabRecord(mostRecentRecord) : null;
}

export async function getSavedTab(id: string): Promise<BanjoTabDocument | null> {
  const database = await openSavedTabsDatabase();
  const record = await getRecord(database, id);
  database.close();
  return record ? fromSavedTabRecord(record) : null;
}

export async function saveTab(
  document: BanjoTabDocument,
): Promise<BanjoTabDocument> {
  const database = await openSavedTabsDatabase();
  await putRecord(database, toSavedTabRecord(document, new Date().toISOString()));
  database.close();
  return document;
}

export async function markOpened(id: string): Promise<void> {
  const database = await openSavedTabsDatabase();
  const record = await getRecord(database, id);

  if (record) {
    await putRecord(database, {
      ...record,
      lastOpenedAt: new Date().toISOString(),
    });
  }

  database.close();
}

export function toSavedTabRecord(
  document: BanjoTabDocument,
  lastOpenedAt: string,
): SavedTabRecord {
  return {
    ...document,
    lastOpenedAt,
    schemaVersion: 1,
  };
}

export function fromSavedTabRecord(record: SavedTabRecord): BanjoTabDocument {
  return {
    id: record.id,
    title: record.title,
    tab: record.tab,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toSavedTabSummary(
  document: BanjoTabDocument,
): SavedTabSummary {
  return {
    id: document.id,
    title: document.title,
    updatedAt: document.updatedAt,
  };
}

export function sortSavedTabSummaries(
  summaries: SavedTabSummary[],
): SavedTabSummary[] {
  return [...summaries].sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
}

function openSavedTabsDatabase(): Promise<IDBDatabase> {
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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open saved tabs database"));
  });
}

function getAllRecords(database: IDBDatabase): Promise<SavedTabRecord[]> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(TAB_STORE_NAME, "readonly")
      .objectStore(TAB_STORE_NAME)
      .getAll();

    request.onsuccess = () => resolve(request.result as SavedTabRecord[]);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to list saved tabs"));
  });
}

function getRecord(
  database: IDBDatabase,
  id: string,
): Promise<SavedTabRecord | null> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(TAB_STORE_NAME, "readonly")
      .objectStore(TAB_STORE_NAME)
      .get(id);

    request.onsuccess = () =>
      resolve((request.result as SavedTabRecord | undefined) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error(`Unable to load saved tab ${id}`));
  });
}

function putRecord(
  database: IDBDatabase,
  record: SavedTabRecord,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(TAB_STORE_NAME, "readwrite")
      .objectStore(TAB_STORE_NAME)
      .put(record);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error(`Unable to save tab ${record.id}`));
  });
}
