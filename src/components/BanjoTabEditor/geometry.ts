export type SlotGeometry = {
  left: number;
  width: number;
  slotCount: number;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function xToNearestSlot(clientX: number, geometry: SlotGeometry): number {
  const relativeX = clamp(clientX - geometry.left, 0, geometry.width);
  const slotWidth = geometry.width / Math.max(geometry.slotCount, 1);
  return clamp(Math.floor(relativeX / slotWidth), 0, geometry.slotCount - 1);
}

export function slotToPercent(position: number, slotCount: number): number {
  if (slotCount <= 0) {
    return 0;
  }

  return ((clamp(position, 0, slotCount - 1) + 0.5) / slotCount) * 100;
}
