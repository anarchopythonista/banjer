type TriggerRect = {
  right: number;
  bottom: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

type PositionOptions = {
  triggerRect: TriggerRect;
  viewport: ViewportSize;
  preferredWidth?: number;
  viewportMargin?: number;
  triggerGap?: number;
};

type PopoverPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

export function getDocumentMenuPopoverPosition({
  triggerRect,
  viewport,
  preferredWidth = 320,
  viewportMargin = 16,
  triggerGap = 8,
}: PositionOptions): PopoverPosition {
  const availableWidth = Math.max(0, viewport.width - viewportMargin * 2);
  const width = Math.min(preferredWidth, availableWidth);
  const top = triggerRect.bottom + triggerGap;
  const maxLeft = Math.max(viewportMargin, viewport.width - width - viewportMargin);
  const left = clamp(triggerRect.right - width, viewportMargin, maxLeft);
  const maxHeight = Math.max(120, viewport.height - top - viewportMargin);

  return {
    left,
    top,
    width,
    maxHeight,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
