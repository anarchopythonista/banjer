import { describe, expect, it } from "vitest";
import { getQuickArticulationIntent } from "./articulationHotkeys";

describe("quick articulation hotkeys", () => {
  it.each([
    ["h", { type: "targeted", articulationType: "hammer-on" }],
    ["H", { type: "targeted", articulationType: "hammer-on" }],
    ["p", { type: "targeted", articulationType: "pull-off" }],
    ["s", { type: "targeted", articulationType: "slide" }],
    ["/", { type: "targeted", articulationType: "slide" }],
    ["\\", { type: "targeted", articulationType: "slide" }],
    ["b", { type: "bend" }],
    ["^", { type: "bend" }],
  ])("maps %s to a quick articulation intent", (key, expected) => {
    expect(getQuickArticulationIntent({ key })).toEqual(expected);
  });

  it("ignores modified, repeated, and unrelated shortcuts", () => {
    expect(getQuickArticulationIntent({ key: "h", metaKey: true })).toBeNull();
    expect(getQuickArticulationIntent({ key: "p", ctrlKey: true })).toBeNull();
    expect(getQuickArticulationIntent({ key: "b", altKey: true })).toBeNull();
    expect(getQuickArticulationIntent({ key: "s", repeat: true })).toBeNull();
    expect(getQuickArticulationIntent({ key: "x" })).toBeNull();
  });
});
