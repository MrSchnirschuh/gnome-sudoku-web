# GNOME Sudoku Web

A true browser implementation of GNOME Sudoku style gameplay using **React + TypeScript + Vite**.

## Features

- Play Sudoku directly in the browser (no container required)
- Difficulty levels with seeded generator (`easy`, `medium`, `hard`)
- Notes / pencil marks per cell
- Undo / Redo
- Desktop-like keyboard controls:
  - Arrow keys: move selection
  - `1`-`9`: enter value (or note in Notes mode)
  - `Backspace` / `Delete`: clear value
  - `Tab` / `Shift+Tab`: move selection
  - `N`: toggle notes mode
  - `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`, `Ctrl/Cmd+Shift+Z`: undo/redo
- Conflict highlighting for invalid duplicates in row/column/box
- Auto-save (debounced) and restore after reload
- JSON export/import of game state
- Timer enabled by default with toggle to disable
- Accessible controls with focus ring and ARIA labels

## Development

Requirements: Node.js 20+ (or compatible modern Node version)

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (default `http://localhost:5173`).

## Build

```bash
npm run build
```

## Tests

```bash
npm test
```

Unit tests cover Sudoku validation/conflict detection, solver behavior, and deterministic generator behavior.

## Persistence format

Game state is saved in browser `localStorage` and includes:

- givens
- current values
- notes
- selected cell
- difficulty and seed
- elapsed time and timer toggle
- undo/redo stacks

You can also export/import this state as JSON from the app controls.
