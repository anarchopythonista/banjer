import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./BanjoTabEditor.css", import.meta.url), "utf8");

describe("BanjoTabEditor mobile drag CSS", () => {
  it("prevents iOS selection and callouts on drag targets", () => {
    expect(css).toContain("-webkit-user-select: none;");
    expect(css).toContain("-webkit-touch-callout: none;");
  });

  it("prevents iOS selection and callouts in the fret picker", () => {
    expect(css).toContain(".banjo-tab-fret-picker,\n.banjo-tab-fret-picker *");
    expect(css).toContain(".banjo-tab-fret-picker,\n.banjo-tab-fret-picker * {\n  -webkit-touch-callout: none;");
    expect(css).toContain(".banjo-tab-fret-picker,\n.banjo-tab-fret-picker * {\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;");
    expect(css).toContain(".banjo-tab-fret-picker,\n.banjo-tab-fret-picker * {\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  user-select: none;");
  });
});
