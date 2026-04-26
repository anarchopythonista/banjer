import { describe, expect, it } from "vitest";
import { slotToPercent, xToNearestSlot } from "./geometry";

describe("BanjoTabEditor geometry", () => {
  it("maps x coordinates to the containing rhythmic slot", () => {
    const geometry = { left: 100, width: 320, slotCount: 16 };

    expect(xToNearestSlot(109, geometry)).toBe(0);
    expect(xToNearestSlot(121, geometry)).toBe(1);
    expect(xToNearestSlot(399, geometry)).toBe(14);
  });

  it("clamps out-of-bounds x coordinates to the first and last slots", () => {
    const geometry = { left: 100, width: 320, slotCount: 16 };

    expect(xToNearestSlot(20, geometry)).toBe(0);
    expect(xToNearestSlot(600, geometry)).toBe(15);
  });

  it("places notes at the horizontal center of each slot", () => {
    expect(slotToPercent(0, 16)).toBeCloseTo(3.125);
    expect(slotToPercent(7, 16)).toBeCloseTo(46.875);
    expect(slotToPercent(15, 16)).toBeCloseTo(96.875);
  });
});
