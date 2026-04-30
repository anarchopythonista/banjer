import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
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

export function FretPickerPopover({
  mode,
  currentNote,
  onSelectFret,
  onClose,
}: FretPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const firstArticulationButtonRef = useRef<HTMLButtonElement>(null);
  const firstEnabledTargetButtonRef = useRef<HTMLButtonElement>(null);
  const fretButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressActivatedRef = useRef(false);
  const currentFret = currentNote?.fret;
  const [phase, setPhase] = useState<PickerPhase>({ type: "plain" });
  const [highlightedFret, setHighlightedFret] = useState(currentFret ?? 0);

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

  useEffect(() => {
    if (mode.type !== "fret-picker") {
      return;
    }

    setPhase({ type: "plain" });
    setHighlightedFret(currentFret ?? 0);
    longPressActivatedRef.current = false;
    clearLongPressTimer(longPressTimerRef);
  }, [currentFret, mode]);

  useEffect(() => {
    if (mode.type !== "fret-picker") {
      return;
    }

    window.setTimeout(() => {
      if (phase.type === "articulation-menu") {
        firstArticulationButtonRef.current?.focus();
        return;
      }

      if (phase.type === "target") {
        firstEnabledTargetButtonRef.current?.focus();
        return;
      }

      (selectedButtonRef.current ?? firstButtonRef.current)?.focus();
    }, 0);
  }, [mode, phase]);

  useEffect(() => {
    if (mode.type !== "fret-picker") {
      return;
    }

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
  }, [mode, onClose]);

  if (mode.type !== "fret-picker" || !position) {
    return null;
  }

  const label = getDialogLabel(phase, Boolean(currentNote));
  const sourceFret = phase.type === "plain" ? highlightedFret : phase.sourceFret;
  const enabledFrets = getEnabledFrets(phase);
  const handleFretGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

  const handleFretPointerDown = (fret: number, event: PointerEvent<HTMLButtonElement>) => {
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

  selectedButtonRef.current = null;
  firstButtonRef.current = null;
  firstEnabledTargetButtonRef.current = null;

  return (
    <div
      ref={popoverRef}
      className="banjo-tab-fret-picker"
      style={{
        left: position.left,
        top: position.top,
        "--fret-picker-max-width": `${POPOVER_MAX_WIDTH}px`,
        "--fret-picker-margin": `${POPOVER_MARGIN}px`,
      }}
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
      {phase.type !== "plain" && (
        <p className="banjo-tab-fret-picker-source">Source fret {sourceFret}</p>
      )}
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
                if (fret === currentFret && phase.type === "plain") {
                  selectedButtonRef.current = button;
                }
                if (fret === 0) {
                  firstButtonRef.current = button;
                }
                if (isAllowed && phase.type === "target" && !firstEnabledTargetButtonRef.current) {
                  firstEnabledTargetButtonRef.current = button;
                }
              }}
              type="button"
              className="banjo-tab-fret-option"
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
            ref={firstArticulationButtonRef}
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
