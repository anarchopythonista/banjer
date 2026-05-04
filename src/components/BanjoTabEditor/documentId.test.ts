import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocumentId } from "./documentId";

describe("createDocumentId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when it is available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "crypto-id",
    });

    expect(createDocumentId()).toBe("crypto-id");
  });

  it("falls back when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});

    const id = createDocumentId();

    expect(id).toMatch(/^tab-/);
    expect(id.length).toBeGreaterThan(12);
  });
});
