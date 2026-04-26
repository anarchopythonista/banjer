import { describe, expect, it } from "vitest";
import {
  findNoteLocationFromPoint,
  isPointInsideRect,
  slotToPercent,
  xToNearestSlot,
} from "./geometry";

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

  it("maps a pointer point to a measure, string, and slot target", () => {
    const target = findNoteLocationFromPoint(
      { x: 155, y: 145 },
      [
        {
          measureId: "measure-1",
          stringIndex: 0,
          rect: { left: 100, top: 100, width: 320, height: 44 },
        },
        {
          measureId: "measure-1",
          stringIndex: 1,
          rect: { left: 100, top: 144, width: 320, height: 44 },
        },
      ],
      16,
    );

    expect(target).toEqual({ measureId: "measure-1", stringIndex: 1, position: 2 });
  });

  it("returns null when a pointer point is outside every string row", () => {
    const target = findNoteLocationFromPoint(
      { x: 155, y: 250 },
      [
        {
          measureId: "measure-1",
          stringIndex: 0,
          rect: { left: 100, top: 100, width: 320, height: 44 },
        },
      ],
      16,
    );

    expect(target).toBeNull();
  });

  it("detects whether a point is inside the trash drop zone", () => {
    const rect = { left: 40, top: 500, width: 320, height: 80 };

    expect(isPointInsideRect({ x: 80, y: 540 }, rect)).toBe(true);
    expect(isPointInsideRect({ x: 20, y: 540 }, rect)).toBe(false);
  });
});
