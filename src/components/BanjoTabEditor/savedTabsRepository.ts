import type {
  BanjoTabDocument,
  SavedTabRecord,
  SavedTabSummary,
} from "./types";
import { openBanjerDatabase, TAB_STORE_NAME } from "./banjerDatabase";

export async function listSavedTabs(): Promise<SavedTabSummary[]> {
  const database = await openSavedTabsDatabase();
  try {
    const records = await getAllRecords(database);
    return sortSavedTabSummaries(
      records.map((record) => toSavedTabSummary(fromSavedTabRecord(record))),
    );
  } finally {
    database.close();
  }
}

export async function getMostRecentTab(): Promise<BanjoTabDocument | null> {
  const database = await openSavedTabsDatabase();
  try {
    const records = await getAllRecords(database);
    const [mostRecentRecord] = [...records].sort((first, second) =>
      second.lastOpenedAt.localeCompare(first.lastOpenedAt),
    );
    return mostRecentRecord ? fromSavedTabRecord(mostRecentRecord) : null;
  } finally {
    database.close();
  }
}

export async function getSavedTab(id: string): Promise<BanjoTabDocument | null> {
  const database = await openSavedTabsDatabase();
  try {
    const record = await getRecord(database, id);
    return record ? fromSavedTabRecord(record) : null;
  } finally {
    database.close();
  }
}

export async function saveTab(
  document: BanjoTabDocument,
): Promise<BanjoTabDocument> {
  const database = await openSavedTabsDatabase();
  try {
    await putRecord(
      database,
      toSavedTabRecord(document, new Date().toISOString()),
    );
    return document;
  } finally {
    database.close();
  }
}

export async function markOpened(id: string): Promise<void> {
  const database = await openSavedTabsDatabase();
  try {
    await markRecordOpened(database, id, new Date().toISOString());
  } finally {
    database.close();
  }
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
  return openBanjerDatabase();
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
    const transaction = database.transaction(TAB_STORE_NAME, "readwrite");
    transaction.objectStore(TAB_STORE_NAME).put(record);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error(`Unable to save tab ${record.id}`));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error(`Unable to save tab ${record.id}`));
  });
}

function markRecordOpened(
  database: IDBDatabase,
  id: string,
  lastOpenedAt: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(TAB_STORE_NAME, "readwrite");
    const store = transaction.objectStore(TAB_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result as SavedTabRecord | undefined;

      if (record) {
        store.put({
          ...record,
          lastOpenedAt,
        });
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error(`Unable to mark tab ${id} opened`));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error(`Unable to mark tab ${id} opened`));
  });
}
