import { openBanjerDatabase, PREFERENCES_STORE_NAME } from "../BanjoTabEditor/banjerDatabase";

export type AppTheme = "light" | "dark";

type PreferenceKey = "theme";

type PreferenceRecord = {
  id: PreferenceKey;
  value: string;
};

export async function getStoredTheme(): Promise<AppTheme | null> {
  const database = await openBanjerDatabase();

  try {
    const record = await getPreferenceRecord(database, "theme");
    return record ? fromPreferenceRecord(record) : null;
  } finally {
    database.close();
  }
}

export async function saveTheme(theme: AppTheme): Promise<void> {
  const database = await openBanjerDatabase();

  try {
    await putPreferenceRecord(database, toPreferenceRecord("theme", theme));
  } finally {
    database.close();
  }
}

export function toPreferenceRecord(
  id: PreferenceKey,
  value: string,
): PreferenceRecord {
  return { id, value };
}

export function fromPreferenceRecord(record: PreferenceRecord): AppTheme | null {
  return isAppTheme(record.value) ? record.value : null;
}

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "light" || value === "dark";
}

function getPreferenceRecord(
  database: IDBDatabase,
  id: PreferenceKey,
): Promise<PreferenceRecord | null> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(PREFERENCES_STORE_NAME, "readonly")
      .objectStore(PREFERENCES_STORE_NAME)
      .get(id);

    request.onsuccess = () =>
      resolve((request.result as PreferenceRecord | undefined) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error(`Unable to load preference ${id}`));
  });
}

function putPreferenceRecord(
  database: IDBDatabase,
  record: PreferenceRecord,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PREFERENCES_STORE_NAME, "readwrite");
    transaction.objectStore(PREFERENCES_STORE_NAME).put(record);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error(`Unable to save preference ${record.id}`));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error(`Unable to save preference ${record.id}`));
  });
}
