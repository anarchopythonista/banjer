import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialTab } from "./constants";
import {
  deleteSavedTab,
  fromSavedTabRecord,
  listSavedTabs,
  saveTab,
  sortSavedTabSummaries,
  toSavedTabRecord,
  toSavedTabSummary,
} from "./savedTabsRepository";
import type { BanjoTabDocument, SavedTabSummary } from "./types";

describe("savedTabsRepository helpers", () => {
  it("converts documents to versioned IndexedDB records", () => {
    const record = toSavedTabRecord(
      document("doc-1", "Cripple Creek"),
      "2026-04-29T12:05:00.000Z",
    );

    expect(record).toMatchObject({
      id: "doc-1",
      title: "Cripple Creek",
      schemaVersion: 1,
      lastOpenedAt: "2026-04-29T12:05:00.000Z",
    });
  });

  it("converts records back to documents without storage metadata", () => {
    const savedDocument = document("doc-1", "Cripple Creek");
    const record = toSavedTabRecord(savedDocument, "2026-04-29T12:05:00.000Z");

    expect(fromSavedTabRecord(record)).toEqual(savedDocument);
  });

  it("creates saved tab summaries", () => {
    expect(toSavedTabSummary(document("doc-1", "Cripple Creek"))).toEqual({
      id: "doc-1",
      title: "Cripple Creek",
      updatedAt: "2026-04-29T12:00:00.000Z",
    });
  });

  it("sorts summaries by most recently updated first", () => {
    const summaries: SavedTabSummary[] = [
      {
        id: "doc-1",
        title: "Older",
        updatedAt: "2026-04-29T12:00:00.000Z",
      },
      {
        id: "doc-2",
        title: "Newer",
        updatedAt: "2026-04-29T12:10:00.000Z",
      },
    ];

    expect(sortSavedTabSummaries(summaries).map((summary) => summary.id)).toEqual(
      ["doc-2", "doc-1"],
    );
  });
});

describe("savedTabsRepository IndexedDB behavior", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("closes the database when listing tabs fails", async () => {
    const { database, openRequest, request } = stubSavedTabsDatabase();

    const result = listSavedTabs();

    openRequest.succeed(database);
    await Promise.resolve();
    request.fail(new Error("list failed"));

    await expect(result).rejects.toThrow("list failed");
    expect(database.close).toHaveBeenCalledOnce();
  });

  it("waits for the write transaction to complete before resolving saved tabs", async () => {
    const { database, openRequest, request, transaction } =
      stubSavedTabsDatabase();
    let settled = false;

    const result = saveTab(document("doc-1", "Cripple Creek")).then(() => {
      settled = true;
    });

    openRequest.succeed(database);
    await Promise.resolve();
    request.succeed("doc-1");
    await flushPromises();

    expect(settled).toBe(false);

    transaction.complete();
    await result;

    expect(settled).toBe(true);
    expect(database.close).toHaveBeenCalledOnce();
  });

  it("rejects and closes the database when a write transaction aborts", async () => {
    const { database, openRequest, request, transaction } =
      stubSavedTabsDatabase();

    const result = saveTab(document("doc-1", "Cripple Creek"));

    openRequest.succeed(database);
    await Promise.resolve();
    request.succeed("doc-1");
    transaction.abortWith(new Error("write aborted"));

    await expect(result).rejects.toThrow("write aborted");
    expect(database.close).toHaveBeenCalledOnce();
  });

  it("waits for the delete transaction to complete before resolving", async () => {
    const { database, openRequest, transaction } = stubSavedTabsDatabase();
    let settled = false;

    const result = deleteSavedTab("doc-1").then(() => {
      settled = true;
    });

    openRequest.succeed(database);
    await flushPromises();

    expect(settled).toBe(false);

    transaction.complete();
    await result;

    expect(settled).toBe(true);
    expect(database.close).toHaveBeenCalledOnce();
  });
});

function document(id: string, title: string): BanjoTabDocument {
  return {
    id,
    title,
    tab: createInitialTab(),
    createdAt: "2026-04-29T12:00:00.000Z",
    updatedAt: "2026-04-29T12:00:00.000Z",
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function stubSavedTabsDatabase(): StubbedIndexedDB {
  const openRequest = createRequest<IDBDatabase>();
  const request = createRequest<unknown>();
  const transaction = createTransaction(request);
  const database = createDatabase(transaction);

  vi.stubGlobal("indexedDB", {
    open: vi.fn(() => openRequest),
  });

  return {
    database,
    openRequest,
    request,
    transaction,
  };
}

type StubbedIndexedDB = {
  database: IDBDatabase & { close: ReturnType<typeof vi.fn> };
  openRequest: TestIDBRequest<IDBDatabase>;
  request: TestIDBRequest<unknown>;
  transaction: TestIDBTransaction;
};

type TestIDBRequest<Result> = IDBRequest<Result> & {
  fail: (error: Error) => void;
  succeed: (result: Result) => void;
};

type TestIDBTransaction = IDBTransaction & {
  abortWith: (error: Error) => void;
  complete: () => void;
};

function createRequest<Result>(): TestIDBRequest<Result> {
  const request = {
    error: null,
    onerror: null,
    onsuccess: null,
    result: undefined,
    fail(error: Error) {
      request.error = error as DOMException;
      request.onerror?.(new Event("error"));
    },
    succeed(result: Result) {
      request.result = result;
      request.onsuccess?.(new Event("success"));
    },
  };

  return request as TestIDBRequest<Result>;
}

function createTransaction(
  request: TestIDBRequest<unknown>,
): TestIDBTransaction {
  const transaction = {
    error: null,
    onabort: null,
    oncomplete: null,
    onerror: null,
    abortWith(error: Error) {
      transaction.error = error as DOMException;
      transaction.onabort?.(new Event("abort"));
    },
    complete() {
      transaction.oncomplete?.(new Event("complete"));
    },
    objectStore: vi.fn(() => ({
      getAll: vi.fn(() => request),
      put: vi.fn(() => request),
      delete: vi.fn(() => request),
    })),
  };

  return transaction as unknown as TestIDBTransaction;
}

function createDatabase(
  transaction: TestIDBTransaction,
): IDBDatabase & { close: ReturnType<typeof vi.fn> } {
  return {
    close: vi.fn(),
    objectStoreNames: {
      contains: vi.fn(() => true),
    },
    transaction: vi.fn(() => transaction),
  } as unknown as IDBDatabase & { close: ReturnType<typeof vi.fn> };
}
