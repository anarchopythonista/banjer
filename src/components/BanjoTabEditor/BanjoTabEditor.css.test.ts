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

describe("BanjoTabEditor mobile header CSS", () => {
  it("keeps long document titles on one line with truncation", () => {
    expect(css).toContain(".banjo-tab-document-title-button,\n.banjo-tab-document-title-input {\n  overflow: hidden;");
    expect(css).toContain(".banjo-tab-document-title-button,\n.banjo-tab-document-title-input {\n  overflow: hidden;\n  text-overflow: ellipsis;");
    expect(css).toContain(".banjo-tab-document-title-button,\n.banjo-tab-document-title-input {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;");
  });

  it("moves editor header actions into a fixed mobile toolbar", () => {
    expect(css).toContain(".banjo-tab-header-actions {\n    position: fixed;");
    expect(css).toContain("bottom: calc(16px + env(safe-area-inset-bottom));");
    expect(css).toContain("padding-bottom: calc(104px + env(safe-area-inset-bottom));");
  });
});

describe("BanjoTabEditor note selection CSS", () => {
  it("renders selected notes with the same ring treatment as hover", () => {
    expect(css).toContain(".banjo-tab-note[data-selected=\"true\"]");
    expect(css).toContain("box-shadow: 0 0 0 3px var(--tab-drag-ring);");
  });

  it("shows the selection cursor across the measure grid", () => {
    expect(css).toContain(".banjo-tab-editor[data-selection-cursor=\"true\"] .banjo-tab-measure-grid,");
    expect(css).toContain(".banjo-tab-editor[data-selection-mode=\"true\"] .banjo-tab-measure-grid,");
  });

  it("draws the selection button insertion caret with serifs", () => {
    expect(css).toContain(".banjo-tab-selection-caret::before");
    expect(css).toContain(".banjo-tab-selection-caret::after");
    expect(css).toContain("border-top: 2px solid currentColor;");
    expect(css).toContain("border-bottom: 2px solid currentColor;");
  });

  it("keeps Add Measure as the right-most mobile action", () => {
    expect(css).toContain(".banjo-tab-add-measure {\n  order: 20;");
    expect(css).toContain(".banjo-tab-selection-mode-button {\n  order: 10;");
  });
});

describe("BanjoTabEditor articulation note CSS", () => {
  it("keeps expanding articulations visually grouped in one pill", () => {
    expect(css).toContain(".banjo-tab-note--articulation {\n  display: block;\n  min-width: 58px;");
    expect(css).toContain(".banjo-tab-note--articulation {\n  display: block;\n  min-width: 58px;\n  height: 30px;");
    expect(css).toContain(".banjo-tab-note--articulation {\n  display: block;\n  min-width: 58px;\n  height: 30px;\n  padding: 0 12px;");
    expect(css).toContain(".banjo-tab-note--articulation::before {\n  content: none;");
  });
});
