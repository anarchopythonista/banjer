# AGENTS.md

## Project Overview

This project is a React application for creating 5-string banjo tablature. The current priority is an interactive tablature editor component, not a full music notation system.

The editor should allow users to:
- View 5 horizontal banjo string lines.
- Start with one measure.
- Add additional measures.
- Click/tap a string slot to open a fret picker.
- Select a fret number to create or edit a note.
- Move notes by dragging.
- Delete notes by dragging to a temporary trash zone.

## Technical Expectations

- Use React and TypeScript.
- Prefer small, composable components.
- Keep interaction logic separate from rendering where practical.
- Keep geometry/pointer math in utility files.
- Store musical positions, not pixel positions.
- Use a reducer or similarly centralized state-management approach.
- Avoid adding heavy dependencies unless there is a clear reason.
- Prefer Pointer Events for mouse/touch/stylus support.
- Add tests for pure state and geometry logic.
- Add Storybook stories for important visual states.

## Product Rules

- There are 5 banjo strings.
- The first MVP should use 16 rhythmic slots per measure.
- Notes snap to the nearest slot.
- Multiple strings can have notes at the same rhythmic position.
- A single string cannot have two notes at the same position.
- Tapping/clicking an empty slot opens the fret picker.
- Tapping/clicking an existing note opens the fret picker to edit that note.
- Desktop users can click-drag notes to move them.
- Touch users should long-press a note, then drag to move it.
- While dragging, show a temporary trash zone.
- Dropping a note on the trash zone deletes it.
- Dropping outside a valid target cancels the move.
- Dropping onto an occupied string/position replaces the existing note.

## Accessibility Expectations

- Do not make the app gesture-only.
- The fret picker should be keyboard navigable.
- Escape should close the picker.
- Buttons need accessible labels.
- The add-measure button must be reachable by keyboard.
- Prefer visible focus states.

## Code Style

- Use clear names over clever names.
- Do not bury important behavior inside large JSX blocks.
- Avoid premature support for advanced banjo notation.
- Keep the MVP focused and stable before adding hammer-ons, pull-offs, slides, rests, playback, import, or export.

## Before Finishing a Task

- Run typecheck if available.
- Run tests if available.
- Update or add Storybook stories if UI states changed.
- Briefly summarize what changed and any follow-up work.

## Storybook MCP Server

When working on UI components, always use the `banjer-sb-mcp` MCP tools to access Storybook's component and documentation knowledge before answering or taking any action.

- **CRITICAL: Never hallucinate component properties!** Before using ANY property on a component from a design system (including common-sounding ones like `shadow`, etc.), you MUST use the MCP tools to check if the property is actually documented for that component.
- Query `list-all-documentation` to get a list of all components
- Query `get-documentation` for that component to see all available properties and examples
- Only use properties that are explicitly documented or shown in example stories
- If a property isn't documented, do not assume properties based on naming conventions or common patterns from other libraries. Check back with the user in these cases.
- Use the `get-storybook-story-instructions` tool to fetch the latest instructions for creating or updating stories. This will ensure you follow current conventions and recommendations.
- Check your work by running `run-story-tests`.

Remember: A story name might not reflect the property name correctly, so always verify properties through documentation or example stories before using them.