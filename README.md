# Banjer

Banjer is a focused React app for writing 5-string banjo tablature in the browser. It is built around a fast, tactile tab editor: add measures, place frets directly on the string grid, drag notes where they belong, and keep ideas moving without turning the app into a full notation suite.

The project is currently centered on the interactive tablature editor MVP.

## Screenshots

#### editor overview  
<img width="1023" height="808" alt="banjer-main-interface-light" src="https://github.com/user-attachments/assets/2f9497c9-bb84-49a5-9b92-e318ac6a1210" />


#### fret picker and note editing  
<img width="411" height="338" alt="banjer-desktop-fret-picker" src="https://github.com/user-attachments/assets/37583eec-9fbe-476b-b4d3-bd031f1eb726" />


#### selecting notes on mobile  
<img width="590" height="1278" alt="banjer-selection-mode-on-mobile" src="https://github.com/user-attachments/assets/ae36e2c7-2272-4dd4-96e4-f8bb24560854" />


## What Banjer Does Today

- Displays 5 banjo strings in standard open-G tuning: `D B G D g`.
- Starts with one 16-slot measure and lets users add more.
- Creates and edits notes through a keyboard-friendly fret picker.
- Supports direct fret entry from hover or focus for quick notation.
- Moves notes with pointer drag interactions and slot snapping.
- Deletes notes and measures by dragging to a temporary trash zone.
- Replaces occupied notes when a moved note lands on the same string and slot.
- Renames tabs and individual measures inline.
- Saves tabs locally in IndexedDB and reloads recent work from the file menu.
- Supports undo and redo from buttons and keyboard shortcuts.
- Provides selection, copy, paste, and paste-preview flows for note groups.
- Includes early banjo techniques: hammer-ons, pull-offs, slides, and bends.
- Ships light and dark themes.

## Why This Exists

Most music notation tools are broad, powerful, and heavy. Banjer takes the opposite bet: a small editor for quickly capturing banjo tab ideas with interactions that feel natural on desktop and touch devices.

The near-term goal is not playback, publishing, MIDI, imports, exports, or a complete theory model. The goal is a stable, pleasant editing surface for banjo tablature.

## Tech Stack

- React 19
- TypeScript
- Vite
- Vitest
- Storybook
- IndexedDB for local saved tabs and preferences
- Pointer Events for mouse, touch, and stylus interactions

## Getting Started

Install dependencies:

```sh
npm install
```

Run the app:

```sh
npm run dev
```

Run Storybook:

```sh
npm run storybook
```

Build for production:

```sh
npm run build
```

## Project Scripts

```sh
npm run dev             # Start the Vite dev server
npm run build           # Create a production build
npm run preview         # Preview the production build
npm run typecheck       # Run TypeScript without emitting files
npm test                # Run Vitest once
npm run lint            # Run ESLint
npm run storybook       # Start Storybook on port 6006
npm run build-storybook # Build the Storybook static site
```

## Architecture Notes

The editor keeps musical positions as durable state, not pixels. Pointer handlers translate screen coordinates into tab locations, and reducer actions update measure, string, slot, and note data.

Important source areas:

- `src/components/BanjoTabEditor/BanjoTabEditor.tsx` wires the editor shell, interaction hooks, document state, and rendering.
- `src/components/BanjoTabEditor/tabReducer.ts` owns core tab mutations.
- `src/components/BanjoTabEditor/documentReducer.ts` owns saved document state.
- `src/components/BanjoTabEditor/geometry.ts` contains coordinate and hit-target helpers.
- `src/components/BanjoTabEditor/selection.ts` contains selection and copy/paste helpers.
- `src/components/BanjoTabEditor/hooks/` keeps pointer and document behavior out of large JSX blocks.
- `src/components/BanjoTabEditor/components/` contains smaller rendering components.
- `src/components/BanjoTabEditor/*.test.ts` covers reducer, geometry, selection, formatting, and persistence behavior.
- `src/components/BanjoTabEditor/BanjoTabEditor.stories.tsx` documents visual and interaction states.

## Editor Model

Banjer currently models each measure as 16 rhythmic slots. Multiple strings can hold notes at the same rhythmic position, while a single string cannot hold two notes in the same slot. Notes snap to slots during interaction, and dropping a note onto an occupied string and slot replaces the previous note.

This keeps the MVP intentionally small while preserving the core mechanics needed for playable 5-string banjo tab.

## Accessibility

Banjer is designed to avoid gesture-only editing:

- Fret picker controls are keyboard navigable.
- Escape closes the picker.
- Add-measure, undo, redo, file-menu, title, and theme controls are reachable by keyboard.
- Notes are rendered as labeled buttons.
- Focus states are visible.
- Touch users can use long-press drag behavior, while desktop users can click-drag.

## Development Priorities

The current product priority is the tab editor, not a complete notation platform. Keep changes aligned with the MVP:

- Prefer small React and TypeScript modules.
- Keep geometry and pointer math in utilities or hooks.
- Keep state changes centralized through reducers.
- Add focused tests for pure state and geometry logic.
- Add Storybook stories when visual states or interactions change.
- Avoid heavy dependencies unless they clearly simplify an established problem.

## Roadmap Ideas

These are intentionally after the stable editor MVP:

- More complete technique notation.
- Rests and durations beyond the current slot model.
- Playback.
- Import and export.
- Print or share views.
- Cloud sync.

## License

No license has been added yet.
