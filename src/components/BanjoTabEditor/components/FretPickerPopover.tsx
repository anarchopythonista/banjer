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

type PickerMode =
  | { type: "select-fret" }
  | { type: "select-technique"; sourceFret: number }
  | { type: "select-target-fret"; sourceFret: number; technique: TargetedArticulationType };

type PickerTransitionDirection = "forward" | "back";

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
  const [pickerMode, setPickerMode] = useState<PickerMode>({ type: "select-fret" });
  const [transitionDirection, setTransitionDirection] = useState<PickerTransitionDirection>("forward");
  const [highlightedFret, setHighlightedFret] = useState(initialFret);

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      getInitialFocusTarget(popoverRef.current, pickerMode, highlightedFret)?.focus();
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [pickerMode]);

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

  const label = getDialogLabel(pickerMode, Boolean(currentNote));
  const heading = getPickerHeading(pickerMode, label);
  const sourceFret = pickerMode.type === "select-fret" ? highlightedFret : pickerMode.sourceFret;
  const enabledFrets = getEnabledFrets(pickerMode);

  const handlePopoverKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (pickerMode.type !== "select-fret" || !isSingleDigitShortcut(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectFret(Number(event.key));
  };

  const handleFretGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const activeIndex = fretButtonRefs.current.findIndex((button) => button === document.activeElement);
    const currentIndex = activeIndex >= 0 ? activeIndex : highlightedFret;
    const columns = getFretGridColumnCount();
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

  const showTechniqueMode = (fret: number) => {
    setTransitionDirection("forward");
    setHighlightedFret(fret);
    setPickerMode({ type: "select-technique", sourceFret: fret });
  };

  const handleAddTechnique = () => {
    showTechniqueMode(sourceFret);
  };

  const handleTechnique = (technique: TargetedArticulationType | "bend") => {
    if (technique === "bend") {
      onSelectFret(sourceFret, { type: "bend" });
      return;
    }

    setTransitionDirection("forward");
    setPickerMode({ type: "select-target-fret", sourceFret, technique });
  };

  const handleBackToFrets = () => {
    setTransitionDirection("back");
    setHighlightedFret(sourceFret);
    setPickerMode({ type: "select-fret" });
  };

  const handleBackToTechniques = () => {
    if (pickerMode.type !== "select-target-fret") {
      return;
    }

    setTransitionDirection("back");
    setPickerMode({ type: "select-technique", sourceFret: pickerMode.sourceFret });
  };

  const handleFretClick = (fret: number) => {
    if (longPressActivatedRef.current) {
      longPressActivatedRef.current = false;
      return;
    }

    if (pickerMode.type === "select-target-fret") {
      if (!isTargetFretAllowed(fret, pickerMode)) {
        return;
      }

      onSelectFret(pickerMode.sourceFret, {
        type: pickerMode.technique,
        targetFret: fret,
      });
      return;
    }

    onSelectFret(fret);
  };

  const handleFretPointerDown = (fret: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || pickerMode.type !== "select-fret") {
      return;
    }

    clearLongPressTimer(longPressTimerRef);
    longPressActivatedRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressActivatedRef.current = true;
      showTechniqueMode(fret);
    }, LONG_PRESS_MS);
  };

  const handleFretPointerEnd = () => {
    clearLongPressTimer(longPressTimerRef);
  };

  const handleFretPointerEnter = (fret: number) => {
    if (!currentNote) {
      setHighlightedFret(fret);
    }
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
      onKeyDown={handlePopoverKeyDown}
      data-picker-mode={pickerMode.type}
      data-transition-direction={transitionDirection}
    >
      <div className="banjo-tab-fret-picker-heading">
        <span>{heading}</span>
        <button type="button" aria-label="Close fret picker" onClick={onClose}>
          x
        </button>
      </div>
      <div className="banjo-tab-fret-picker-screen">
        {(pickerMode.type === "select-fret" || pickerMode.type === "select-target-fret") && (
          <>
            <div
              className="banjo-tab-fret-grid"
              role="group"
              aria-label={
                pickerMode.type === "select-target-fret"
                  ? `${getTechniqueLabel(pickerMode.technique)} target frets`
                  : "Frets 0 through 22"
              }
              onKeyDown={handleFretGridKeyDown}
            >
              {FRETS.map((fret) => {
                const isAllowed =
                  pickerMode.type !== "select-target-fret" ||
                  isTargetFretAllowed(fret, pickerMode);
                const isSource =
                  pickerMode.type === "select-target-fret" && fret === pickerMode.sourceFret;

                return (
                  <button
                    key={fret}
                    ref={(button) => {
                      fretButtonRefs.current[fret] = button;
                    }}
                    type="button"
                    className="banjo-tab-fret-option"
                    data-fret={fret}
                    data-highlighted={pickerMode.type === "select-fret" && fret === highlightedFret}
                    aria-label={getFretLabel(fret, pickerMode, isAllowed)}
                    aria-pressed={fret === currentFret || isSource}
                    disabled={!isAllowed}
                    onFocus={() => setHighlightedFret(fret)}
                    onPointerEnter={() => handleFretPointerEnter(fret)}
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
            {pickerMode.type === "select-fret" && (
              <button
                type="button"
                className="banjo-tab-fret-more-button"
                aria-label={`Add technique for fret ${sourceFret}`}
                onClick={handleAddTechnique}
              >
                Add technique
              </button>
            )}
            {pickerMode.type === "select-target-fret" && (
              <button
                type="button"
                className="banjo-tab-fret-back-button"
                onClick={handleBackToTechniques}
              >
                Back
              </button>
            )}
          </>
        )}
        {pickerMode.type === "select-technique" && (
          <div className="banjo-tab-technique-screen">
            <div className="banjo-tab-articulation-actions" aria-label="Techniques">
              <button
                data-fret-picker-articulation-button="true"
                type="button"
                onClick={() => handleTechnique("hammer-on")}
              >
                Hammer-on
              </button>
              <button type="button" onClick={() => handleTechnique("pull-off")}>
                Pull-off
              </button>
              <button type="button" onClick={() => handleTechnique("slide")}>
                Slide
              </button>
              <button
                type="button"
                aria-label="Bend, creates note immediately"
                onClick={() => handleTechnique("bend")}
              >
                Bend
              </button>
              <button type="button" onClick={handleBackToFrets}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
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
  pickerMode: PickerMode,
  currentFret: number,
) {
  if (!popover) {
    return null;
  }

  if (pickerMode.type === "select-technique") {
    return popover.querySelector<HTMLButtonElement>(
      "[data-fret-picker-articulation-button]",
    );
  }

  if (pickerMode.type === "select-target-fret") {
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

function getDialogLabel(pickerMode: PickerMode, hasCurrentNote: boolean) {
  if (pickerMode.type === "select-technique") {
    return "Choose technique";
  }

  if (pickerMode.type === "select-target-fret") {
    return `Choose ${getTechniqueLabel(pickerMode.technique)} target`;
  }

  return hasCurrentNote ? "Edit fret" : "Choose fret";
}

function getPickerHeading(pickerMode: PickerMode, label: string) {
  if (pickerMode.type === "select-technique") {
    return `Fret ${pickerMode.sourceFret}`;
  }

  if (pickerMode.type === "select-target-fret") {
    return `${pickerMode.sourceFret}${getTechniqueSymbol(pickerMode.technique)}... choose target`;
  }

  return label;
}

function getTechniqueLabel(technique: TargetedArticulationType) {
  switch (technique) {
    case "hammer-on":
      return "Hammer-on";
    case "pull-off":
      return "Pull-off";
    case "slide":
      return "Slide";
  }
}

function getTechniqueSymbol(technique: TargetedArticulationType) {
  switch (technique) {
    case "hammer-on":
      return "h";
    case "pull-off":
      return "p";
    case "slide":
      return "/";
  }
}

function getFretLabel(fret: number, pickerMode: PickerMode, isAllowed: boolean) {
  if (pickerMode.type !== "select-target-fret") {
    return `Fret ${fret}`;
  }

  if (isAllowed) {
    return `Fret ${fret}`;
  }

  return `Fret ${fret} unavailable for ${getTechniqueLabel(pickerMode.technique)} target`;
}

function getEnabledFrets(pickerMode: PickerMode) {
  if (pickerMode.type !== "select-target-fret") {
    return FRETS;
  }

  return FRETS.filter((fret) => isTargetFretAllowed(fret, pickerMode));
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

function getFretGridColumnCount() {
  return window.matchMedia("(max-width: 420px)").matches ? 4 : 6;
}

function isTargetFretAllowed(fret: number, pickerMode: Extract<PickerMode, { type: "select-target-fret" }>) {
  switch (pickerMode.technique) {
    case "hammer-on":
      return fret > pickerMode.sourceFret;
    case "pull-off":
      return fret < pickerMode.sourceFret;
    case "slide":
      return fret !== pickerMode.sourceFret;
  }
}

function isSingleDigitShortcut(event: ReactKeyboardEvent): boolean {
  return (
    !event.repeat &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.key.length === 1 &&
    event.key >= "0" &&
    event.key <= "9"
  );
}
