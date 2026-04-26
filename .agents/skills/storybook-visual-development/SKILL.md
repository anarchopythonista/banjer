---
name: storybook-visual-development
description: Use when creating, updating, reviewing, or testing Storybook stories for React UI components, especially when stories should cover default rendering, edge cases, interaction states, accessibility states, or visual regression surfaces.
---

# Storybook Visual Development

## Goal

Create stories that make a component easy to inspect, test, and evolve. A good story set shows the normal experience, the uncomfortable edges, and the states that only appear after users interact.

## Required First Steps

- Use the Storybook MCP server before touching stories.
- Call `list-all-documentation` when you need to discover available component docs.
- Call `get-documentation` before using props from any documented design-system component.
- Call `get-storybook-story-instructions` before creating or editing any `*.stories.*` file.
- If examples do not show the prop or composition you need, use `get-documentation-for-story` or choose a documented alternative.

Do not invent component props from naming conventions. If a prop is not documented or shown in examples, treat it as unavailable.

## Story Set

For each meaningful component, create or preserve these story categories:

- **Default:** the ordinary, production-shaped rendering with realistic content.
- **Edge cases:** empty, loading, disabled, long labels, dense data, min/max values, validation errors, overflow, narrow layout, and missing optional data as relevant.
- **Interaction states:** open popovers, selected items, focused controls, drag or edit modes, keyboard-reachable states, destructive confirmations, and transient UI.

Prefer a small set of high-signal stories over a gallery of cosmetic variants. Add a story when it protects a real behavior, visual state, or accessibility path.

## Writing Stories

- Use the repo's existing story patterns, imports, decorators, and naming style.
- Keep story args realistic and domain-specific.
- Avoid test-only prose in rendered UI.
- Prefer composed fixtures and small helpers when several stories share setup.
- Keep interaction setup explicit with `play` functions when the visible state depends on user action.
- Use `storybook/test` utilities according to the current Storybook instructions.
- For stateful interactions, drive the component the way a user would when practical rather than forcing internal state.
- Do not add heavyweight mock layers unless the component genuinely needs external services.

## Accessibility Coverage

Stories for interactive components should expose:

- keyboard entry and exit paths;
- visible focus states;
- selected, expanded, disabled, invalid, and destructive states when applicable;
- open picker, dialog, menu, popover, or tooltip states;
- non-pointer alternatives for drag, long-press, hover, or gesture behavior.

Fix semantic accessibility issues directly. Ask before changing visual design solely to address color, contrast, spacing, or other design-sensitive a11y findings.

## Banjo Editor Defaults

For tablature-editor work, include stories that show:

- one empty measure;
- multiple measures;
- notes on multiple strings at the same slot;
- an occupied slot replacement scenario;
- fret picker closed and open for both create and edit flows;
- dragging or moving state with the temporary trash zone visible;
- deletion/cancel states when the UI supports them;
- keyboard-accessible note editing or movement paths.

Keep the MVP focused on five strings and sixteen slots per measure unless the product rules change.

## Verification

Before finishing:

- Run focused story tests with `run-story-tests` for touched stories.
- Use `preview-stories` for the most important visual states and include returned URLs in the final response.
- Run typecheck and unit tests if the story work changed component code or shared fixtures.
- Report any test or preview step that could not run.

## Common Failures

- **Only a happy path:** add the one edge case most likely to break layout or behavior.
- **Screenshots without interaction:** add `play` coverage or a controlled open-state story for transient UI.
- **Prop guessing:** stop and check Storybook documentation before continuing.
- **Gesture-only stories:** add keyboard-accessible stories or verify the alternate path is visible.
- **Too many variants:** merge cosmetic duplicates and keep stories tied to behavior, content pressure, or accessibility.
