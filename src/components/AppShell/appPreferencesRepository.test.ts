import { describe, expect, it } from "vitest";
import {
  fromPreferenceRecord,
  isAppTheme,
  toPreferenceRecord,
} from "./appPreferencesRepository";

describe("appPreferencesRepository helpers", () => {
  it("converts a theme to a stored preference record", () => {
    expect(toPreferenceRecord("theme", "dark")).toEqual({
      id: "theme",
      value: "dark",
    });
  });

  it("converts a valid theme preference record back to a theme", () => {
    expect(fromPreferenceRecord({ id: "theme", value: "light" })).toBe("light");
  });

  it("ignores invalid theme preference records", () => {
    expect(fromPreferenceRecord({ id: "theme", value: "sepia" })).toBeNull();
    expect(isAppTheme("sepia")).toBe(false);
  });
});
