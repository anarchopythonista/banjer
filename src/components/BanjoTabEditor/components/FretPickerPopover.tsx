import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { containPopoverPosition } from "../geometry";
import type { EditorMode, TabArticulation, TabNoteData } from "../types";

type FretPickerPopoverProps = {
  mode: EditorMode;
  currentNote?: TabNoteData;
  onSelectFret: (fret: number, articulation?: TabArticulation) => void;
  onClose: () => void;
};

const FRETS = Array.from({ length: 23 }, (_, fret) => fret);
const POPOVER_MAX_WIDTH = 316;
const POPOVER_MARGIN = 16;
const LONG_PRESS_MS = 350;

type TargetedArticulationType = "hammer-on" | "pull-off" | "slide";

type PickerPhase =
  | { type: "plain" }
  | { type: "articulation-menu"; sourceFret: number }
  | { type: "target"; sourceFret: number; articulation: TargetedArticulationType };

type PopoverPosition = {
  left: number;
  top: number;
};

type FretPickerStyle = CSSProperties & {
  "--fret-picker-max-width": string;
  "--fret-picker-margin": string;
};

export function FretPickerPopover({
  mode,
  currentNote,
  onSelectFret,
  onClose,
}: FretPickerPopoverProps) {
  const position = useMemo(() => {
    if (mode.type !== "fret-picker") {
      return null;
    }

    const containedPosition = containPopoverPosition(
      mode.screenPoint,
      { width: window.innerWidth, height: window.innerHeight },
      {
        width: POPOVER_MAX_WIDTH,
        margin: POPOVER_MARGIN,
        offsetY: 18,
        minTop: 92,
      },
    );

    return {
      left: containedPosition.x,
      top: containedPosition.y,
    };
  }, [mode]);

  if (mode.type !== "fret-picker" || !position) {
    return null;
  }

  const initialFret = currentNote?.fret ?? 0;
  const pickerKey = [
    mode.location.measureId,
    mode.location.stringIndex,
    mode.location.position,
    mode.noteId ?? "new-note",
    initialFret,
  ].join(":");

  return (
    <FretPickerPopoverContent
      key={pickerKey}
      currentNote={currentNote}
      initialFret={initialFret}
      position={position}
      onSelectFret={onSelectFret}
      onClose={onClose}
    />
  );
}

type FretPickerPopoverContentProps = {
  currentNote?: TabNoteData;
  initialFret: number;
  position: PopoverPosition;
  onSelectFret: (fret: number, articulation?: TabArticulation) => void;
  onClose: () => void;
};

function FretPickerPopoverContent({
  currentNote,
  initialFret,
  position,
  onSelectFret,
  onClose,
}: FretPickerPopoverContentProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const fretButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressActivatedRef = useRef(false);
  const currentFret = currentNote?.fret;
  const [phase, setPhase] = useState<PickerPhase>({ type: "plain" });
  const [highlightedFret, setHighlightedFret] = useState(initialFret);

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      getInitialFocusTarget(popoverRef.current, phase, initialFret)?.focus();
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [initialFret, phase]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      clearLongPressTimer(longPressTimerRef);
    };
  }, [onClose]);

  const label = getDialogLabel(phase, Boolean(currentNote));
  const sourceFret = phase.type === "plain" ? highlightedFret : phase.sourceFret;
  const enabledFrets = getEnabledFrets(phase);
  const handleFretGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const activeIndex = fretButtonRefs.current.findIndex((button) => button === document.activeElement);
    const currentIndex = activeIndex >= 0 ? activeIndex : currentFret ?? 0;
    const columns = 6;
    const nextIndexByKey: Record<string, number> = {
      ArrowRight: currentIndex + 1,
      ArrowLeft: currentIndex - 1,
      ArrowDown: currentIndex + columns,
      ArrowUp: currentIndex - columns,
      Home: 0,
      End: FRETS.length - 1,
    };
    const nextIndex = findFocusableFret(
      Math.min(Math.max(nextIndexByKey[event.key], 0), FRETS.length - 1),
      event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1,
      enabledFrets,
    );
    fretButtonRefs.current[nextIndex]?.focus();
  };

  const openArticulationMenu = (fret: number) => {
    setHighlightedFret(fret);
    setPhase({ type: "articulation-menu", sourceFret: fret });
  };

  const handleMore = () => {
    openArticulationMenu(sourceFret);
  };

  const handleArticulation = (articulation: TargetedArticulationType | "bend") => {
    if (articulation === "bend") {
      onSelectFret(sourceFret, { type: "bend" });
      return;
    }

    setPhase({ type: "target", sourceFret, articulation });
  };

  const handleFretClick = (fret: number) => {
    if (longPressActivatedRef.current) {
      longPressActivatedRef.current = false;
      return;
    }

    if (phase.type === "target") {
      if (!isTargetFretAllowed(fret, phase)) {
        return;
      }

      onSelectFret(phase.sourceFret, {
        type: phase.articulation,
        targetFret: fret,
      });
      return;
    }

    if (phase.type === "articulation-menu") {
      openArticulationMenu(fret);
      return;
    }

    onSelectFret(fret);
  };

  const handleFretPointerDown = (fret: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    clearLongPressTimer(longPressTimerRef);
    longPressActivatedRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressActivatedRef.current = true;
      openArticulationMenu(fret);
    }, LONG_PRESS_MS);
  };

  const handleFretPointerEnd = () => {
    clearLongPressTimer(longPressTimerRef);
  };

  const popoverStyle: FretPickerStyle = {
    left: position.left,
    top: position.top,
    "--fret-picker-max-width": `${POPOVER_MAX_WIDTH}px`,
    "--fret-picker-margin": `${POPOVER_MARGIN}px`,
  };

  return (
    <div
      ref={popoverRef}
      className="banjo-tab-fret-picker"
      style={popoverStyle}
      role="dialog"
      aria-modal="false"
      aria-label={label}
    >
      <div className="banjo-tab-fret-picker-heading">
        <span>{label}</span>
        <button type="button" aria-label="Close fret picker" onClick={onClose}>
          x
        </button>
      </div>
      <div
        className="banjo-tab-fret-grid"
        role="group"
        aria-label={phase.type === "target" ? `${getArticulationLabel(phase.articulation)} target frets` : "Frets 0 through 22"}
        onKeyDown={handleFretGridKeyDown}
      >
        {FRETS.map((fret) => {
          const isAllowed = phase.type !== "target" || isTargetFretAllowed(fret, phase);
          const isSource = fret === sourceFret && phase.type !== "plain";

          return (
            <button
              key={fret}
              ref={(button) => {
                fretButtonRefs.current[fret] = button;
              }}
              type="button"
              className="banjo-tab-fret-option"
              data-fret={fret}
              aria-label={getFretLabel(fret, phase, isAllowed)}
              aria-pressed={fret === currentFret || isSource}
              disabled={!isAllowed}
              onFocus={() => setHighlightedFret(fret)}
              onPointerEnter={() => setHighlightedFret(fret)}
              onPointerDown={(event) => handleFretPointerDown(fret, event)}
              onPointerUp={handleFretPointerEnd}
              onPointerCancel={handleFretPointerEnd}
              onPointerLeave={handleFretPointerEnd}
              onClick={() => handleFretClick(fret)}
            >
              {fret}
            </button>
          );
        })}
      </div>
      {phase.type === "plain" && (
        <button
          type="button"
          className="banjo-tab-fret-more-button"
          onClick={handleMore}
        >
          More for fret {sourceFret}
        </button>
      )}
      {phase.type === "articulation-menu" && (
        <div className="banjo-tab-articulation-actions" aria-label="Articulations">
          <button
            data-fret-picker-articulation-button="true"
            type="button"
            onClick={() => handleArticulation("hammer-on")}
          >
            Hammer-on
          </button>
          <button type="button" onClick={() => handleArticulation("pull-off")}>
            Pull-off
          </button>
          <button type="button" onClick={() => handleArticulation("slide")}>
            Slide
          </button>
          <button type="button" onClick={() => handleArticulation("bend")}>
            Bend
          </button>
          <button type="button" onClick={() => setPhase({ type: "plain" })}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function clearLongPressTimer(ref: { current: number | null }) {
  if (ref.current !== null) {
    window.clearTimeout(ref.current);
    ref.current = null;
  }
}

function getInitialFocusTarget(
  popover: HTMLDivElement | null,
  phase: PickerPhase,
  currentFret: number,
) {
  if (!popover) {
    return null;
  }

  if (phase.type === "articulation-menu") {
    return popover.querySelector<HTMLButtonElement>(
      "[data-fret-picker-articulation-button]",
    );
  }

  if (phase.type === "target") {
    return popover.querySelector<HTMLButtonElement>(
      ".banjo-tab-fret-option:not(:disabled)",
    );
  }

  return (
    popover.querySelector<HTMLButtonElement>(
      `.banjo-tab-fret-option[data-fret="${currentFret}"]`,
    ) ??
    popover.querySelector<HTMLButtonElement>(".banjo-tab-fret-option")
  );
}

function getDialogLabel(phase: PickerPhase, hasCurrentNote: boolean) {
  if (phase.type === "articulation-menu") {
    return "Choose articulation";
  }

  if (phase.type === "target") {
    return `Choose ${getArticulationLabel(phase.articulation)} target`;
  }

  return hasCurrentNote ? "Edit fret" : "Choose fret";
}

function getArticulationLabel(articulation: TargetedArticulationType) {
  switch (articulation) {
    case "hammer-on":
      return "Hammer-on";
    case "pull-off":
      return "Pull-off";
    case "slide":
      return "Slide";
  }
}

function getFretLabel(fret: number, phase: PickerPhase, isAllowed: boolean) {
  if (phase.type !== "target") {
    return `Fret ${fret}`;
  }

  if (isAllowed) {
    return `Fret ${fret}`;
  }

  return `Fret ${fret} unavailable for ${getArticulationLabel(phase.articulation)} target`;
}

function getEnabledFrets(phase: PickerPhase) {
  if (phase.type !== "target") {
    return FRETS;
  }

  return FRETS.filter((fret) => isTargetFretAllowed(fret, phase));
}

function findFocusableFret(startIndex: number, direction: 1 | -1, enabledFrets: number[]) {
  if (enabledFrets.includes(startIndex)) {
    return startIndex;
  }

  const sortedFrets = [...enabledFrets].sort((a, b) => a - b);

  if (direction === -1) {
    return [...sortedFrets].reverse().find((fret) => fret < startIndex) ?? sortedFrets[0] ?? 0;
  }

  return sortedFrets.find((fret) => fret > startIndex) ?? sortedFrets[sortedFrets.length - 1] ?? 0;
}

function isTargetFretAllowed(fret: number, phase: Extract<PickerPhase, { type: "target" }>) {
  switch (phase.articulation) {
    case "hammer-on":
      return fret > phase.sourceFret;
    case "pull-off":
      return fret < phase.sourceFret;
    case "slide":
      return fret !== phase.sourceFret;
  }
}
