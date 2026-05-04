import { describe, expect, it } from "vitest";
import { getDocumentMenuPopoverPosition } from "./documentMenuPosition";

describe("getDocumentMenuPopoverPosition", () => {
  it("keeps the popover visible when the trigger is near the left edge", () => {
    const position = getDocumentMenuPopoverPosition({
      triggerRect: {
        right: 52,
        bottom: 44,
      },
      viewport: {
        width: 390,
        height: 844,
      },
    });

    expect(position.left).toBe(16);
    expect(position.width).toBe(320);
    expect(position.left + position.width).toBeLessThanOrEqual(374);
  });

  it("right-aligns the popover when there is enough viewport space", () => {
    const position = getDocumentMenuPopoverPosition({
      triggerRect: {
        right: 370,
        bottom: 44,
      },
      viewport: {
        width: 390,
        height: 844,
      },
    });

    expect(position.left).toBe(50);
    expect(position.width).toBe(320);
  });

  it("shrinks the popover on very narrow viewports", () => {
    const position = getDocumentMenuPopoverPosition({
      triggerRect: {
        right: 280,
        bottom: 44,
      },
      viewport: {
        width: 300,
        height: 640,
      },
    });

    expect(position.left).toBe(16);
    expect(position.width).toBe(268);
    expect(position.left + position.width).toBe(284);
  });
});
