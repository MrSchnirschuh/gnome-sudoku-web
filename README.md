# gnome-sudoku-web

A native browser implementation of a GNOME Sudoku-style web variant built with TypeScript + React + Vite.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

## Features

- 9x9 Sudoku gameplay
- Difficulty selector with built-in unique-solution puzzles (`Easy`, `Medium`, `Hard`)
- Notes mode (pencil marks)
- Conflict highlighting (row/column/box duplicates)
- Undo/Redo buttons and keyboard shortcuts
- Keyboard controls
  - Arrow keys: move selection
  - Tab / Shift+Tab: logical next/previous cell
  - `1-9`: enter digit (or toggle note when Notes mode is on)
  - Backspace/Delete/`0`: clear selected editable cell
  - `Ctrl/Cmd+Z`: undo
  - `Ctrl/Cmd+Y` or `Ctrl/Cmd+Shift+Z`: redo
  - `N`: toggle notes mode
- Persistence across page reloads (localStorage)
  - puzzle id and givens
  - current values
  - notes
  - selected cell
  - difficulty
  - undo/redo history
  - timer status and elapsed time
- Export current game state to JSON
- Import previously exported JSON game state
- Optional timer toggle (default on)

## Persistence behavior

Game state is automatically saved to localStorage after every change. Reloading the page restores the game state, including timer progression (if timer is enabled).

## Export/Import

- Click **Export** to download the current game state as JSON.
- Click **Import** to load a previously exported JSON file.

## Assets and licensing

This implementation currently uses original CSS/HTML and does not bundle GNOME/Adwaita icon assets.
