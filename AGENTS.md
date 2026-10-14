# Repository Guidelines

## Project Structure & Module Organization

The application lives in `ui-workbench-mvp/`, a zero-build browser prototype for assembling components and exporting HTML.

- `index.html`: workbench layout and dialogs.
- `src/core.js`: component definitions, project tree operations, validation, and Vanilla/Vue HTML generation.
- `src/app.js`: DOM interactions, drag-and-drop, inspector, history, and local storage.
- `src/styles.css`: editor and responsive layout styles.
- `tests/core.test.js`: core behavior and security regression tests.
- `examples/`: sample project JSON and exported HTML; `workbench-preview.png` is a visual reference.
- `README.md` and `ARCHITECTURE.md`: usage, limitations, and architectural direction.

## Build, Test, and Development Commands

Run commands from the application directory:

```powershell
cd ui-workbench-mvp
npm start
npm test
```

`npm start` uses Python's HTTP server on port 8000; open `http://localhost:8000`. Alternatively, use `python -m http.server 8765` for another port. Python 3 and Node.js with built-in test-runner support are required. No package installation or build step is needed. Serve over HTTP because browser ES modules may fail under `file://`.

## Coding Style & Naming Conventions

Use JavaScript ES modules, two-space indentation, semicolons, and single-quoted strings, following nearby code. Use camelCase for functions and variables, uppercase constants such as `MAX_HISTORY`, and kebab-case CSS classes. Keep framework-independent logic in `core.js` and DOM behavior in `app.js`. Preserve the project tree as the source of truth; generate HTML from it. No formatter or linter is configured; avoid unrelated reformatting.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`. Add descriptive `test('behavior', ...)` cases in `tests/*.test.js` for changed tree operations, validation, escaping, or export behavior. Run `npm test` before submitting. No coverage threshold is configured. For UI changes, manually check nesting, inspector edits, undo/redo, JSON import/export, preview, and affected responsive layouts.

## Commit & Pull Request Guidelines

No Git history is available in this workspace, so an existing commit convention cannot be verified. Use concise imperative subjects, such as `Fix nested component reordering`. PRs should explain the change, reference relevant issues, report test results, and include screenshots for visual changes.

## Security & Configuration

Keep external CSS/JS in exported pages or the preview iframe. Preserve `sandbox="allow-scripts"` without `allow-same-origin`, input validation, URL checks, and HTML escaping. Use trusted dependency URLs; CDN previews require network access.