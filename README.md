# GNOME Sudoku Web

A true browser implementation of GNOME Sudoku style gameplay using **React + TypeScript + Vite**.

## Features

- Play Sudoku directly in the browser (no container required)
- Difficulty levels with seeded generator (`easy`, `medium`, `hard`)
- Notes / pencil marks per cell (3 × 3 grid inside each cell, GNOME-style)
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

---

## Running with Docker

### Development (live-reload)

```bash
docker compose up dev
```

Open <http://localhost:5173> in your browser.  
Source files are mounted into the container so edits are reflected immediately.

### Production (nginx, optimised build)

```bash
docker compose --profile prod up --build prod
```

Open <http://localhost:8080>.  
This runs a multi-stage build: Node 22 compiles the TypeScript bundle, then nginx 1.27 serves the resulting static files.

---

## Running without Docker

Requirements: **Node.js 20+**

```bash
npm install

# Development server
npm run dev

# Production build (output in ./dist)
npm run build
npm run preview   # preview the production build locally
```

---

## Tests

```bash
npm test
```

Unit tests cover Sudoku validation/conflict detection, solver behaviour, and deterministic generator behaviour.

## Linting

```bash
npm run lint
```

---

## Persistence format

Game state is saved in browser `localStorage` under the key `gnome-sudoku-web-save-v1` and includes:

| Field | Description |
|-------|-------------|
| `version` | Schema version (currently `1`) — bump to trigger graceful reset |
| `difficulty` | `easy` / `medium` / `hard` |
| `seed` | Deterministic puzzle seed |
| `givens` | Which cells are fixed clues |
| `values` | Current cell values |
| `notes` | Pencil marks per cell |
| `selected` | Active cell index |
| `notesMode` | Whether notes mode is active |
| `elapsedSeconds` | Timer value |
| `timerEnabled` | Timer toggle state |
| `undoStack` / `redoStack` | Move history |

Corrupted or version-mismatched data is silently discarded and a fresh game starts.  
You can also export/import the full state as JSON from the in-app controls.

