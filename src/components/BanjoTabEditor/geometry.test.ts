import { describe, expect, it } from "vitest";
import {
  containPopoverPosition,
  findMeasureDropIndexFromPoint,
  findNearestNoteLocationFromPoint,
  findNoteLocationFromPoint,
  isPointInsideRect,
  slotSpanToPercentBounds,
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

  it("maps a slot span to start and end slot centers", () => {
    expect(slotSpanToPercentBounds(4, 2, 16)).toEqual({
      start: 28.125,
      end: 34.375,
      width: 6.25,
    });
    expect(slotSpanToPercentBounds(4, 3, 16)).toEqual({
      start: 28.125,
      end: 40.625,
      width: 12.5,
    });
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

  it("maps a pointer point between string rows to the nearest string in the measure", () => {
    const target = findNearestNoteLocationFromPoint(
      { x: 155, y: 154 },
      [
        {
          measureId: "measure-1",
          stringIndex: 0,
          rect: { left: 100, top: 100, width: 320, height: 44 },
        },
        {
          measureId: "measure-1",
          stringIndex: 1,
          rect: { left: 100, top: 160, width: 320, height: 44 },
        },
      ],
      16,
    );

    expect(target).toEqual({ measureId: "measure-1", stringIndex: 1, position: 2 });
  });

  it("detects whether a point is inside the trash drop zone", () => {
    const rect = { left: 40, top: 500, width: 320, height: 80 };

    expect(isPointInsideRect({ x: 80, y: 540 }, rect)).toBe(true);
    expect(isPointInsideRect({ x: 20, y: 540 }, rect)).toBe(false);
  });

  it("keeps a centered popover fully inside the horizontal viewport edges", () => {
    const leftEdgePosition = containPopoverPosition(
      { x: 12, y: 120 },
      { width: 390, height: 800 },
      { width: 316, margin: 16, offsetY: 18, minTop: 92 },
    );
    const rightEdgePosition = containPopoverPosition(
      { x: 386, y: 120 },
      { width: 390, height: 800 },
      { width: 316, margin: 16, offsetY: 18, minTop: 92 },
    );

    expect(leftEdgePosition.x).toBe(174);
    expect(rightEdgePosition.x).toBe(216);
  });

  it("keeps a measured popover fully inside the vertical viewport edges", () => {
    const position = containPopoverPosition(
      { x: 195, y: 760 },
      { width: 390, height: 800 },
      { width: 316, height: 300, margin: 16, offsetY: 18, minTop: 92 },
    );

    expect(position.y).toBe(484);
  });

  it("maps a pointer point to a measure drop index", () => {
    const measures = [
      { measureId: "measure-1", rect: { left: 100, top: 100, width: 500, height: 120 } },
      { measureId: "measure-2", rect: { left: 100, top: 240, width: 500, height: 120 } },
      { measureId: "measure-3", rect: { left: 100, top: 380, width: 500, height: 120 } },
    ];

    expect(findMeasureDropIndexFromPoint({ x: 120, y: 110 }, measures)).toBe(0);
    expect(findMeasureDropIndexFromPoint({ x: 120, y: 315 }, measures)).toBe(2);
    expect(findMeasureDropIndexFromPoint({ x: 120, y: 560 }, measures)).toBe(3);
  });

  it("returns null for measure drop index when the point is outside the measure column", () => {
    expect(findMeasureDropIndexFromPoint(
      { x: 20, y: 110 },
      [{ measureId: "measure-1", rect: { left: 100, top: 100, width: 500, height: 120 } }],
    )).toBeNull();
  });
});
