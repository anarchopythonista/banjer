import type { TargetedArticulationType } from "./types";

export type QuickArticulationIntent =
  | { type: "targeted"; articulationType: TargetedArticulationType }
  | { type: "bend" };

type QuickArticulationKeyboardEvent = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  repeat?: boolean;
};

export function getQuickArticulationIntent(
  event: QuickArticulationKeyboardEvent,
): QuickArticulationIntent | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }

  switch (event.key.toLowerCase()) {
    case "h":
      return { type: "targeted", articulationType: "hammer-on" };
    case "p":
      return { type: "targeted", articulationType: "pull-off" };
    case "s":
    case "/":
    case "\\":
      return { type: "targeted", articulationType: "slide" };
    case "b":
    case "^":
      return { type: "bend" };
    default:
      return null;
  }
}
