import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  type Difficulty,
  findConflicts,
  formatTime,
  generatePuzzle,
  randomSeed,
  solveSudoku,
} from './sudoku'

type Notes = number[][]

type BoardSnapshot = {
  values: number[]
  notes: Notes
  selected: number
  notesMode: boolean
  elapsedSeconds: number
  timerEnabled: boolean
}

type PersistedGame = {
  version: 1
  difficulty: Difficulty
  seed: number
  givens: boolean[]
  solution: number[]
  values: number[]
  notes: Notes
  selected: number
  notesMode: boolean
  elapsedSeconds: number
  timerEnabled: boolean
  undoStack: BoardSnapshot[]
  redoStack: BoardSnapshot[]
}

const SAVE_KEY = 'gnome-sudoku-web-save-v1'
const EMPTY_NOTES: Notes = Array.from({ length: 81 }, () => [])

function cloneNotes(notes: Notes): Notes {
  return notes.map((entry) => [...entry])
}

function isValidNotes(notes: unknown): notes is Notes {
  return (
    Array.isArray(notes) &&
    notes.length === 81 &&
    notes.every(
      (n) =>
        Array.isArray(n) &&
        n.every((value) => Number.isInteger(value) && value >= 1 && value <= 9),
    )
  )
}

function isValidSnapshot(snapshot: unknown): snapshot is BoardSnapshot {
  if (!snapshot || typeof snapshot !== 'object') {
    return false
  }

  const candidate = snapshot as Record<string, unknown>
  return (
    Array.isArray(candidate.values) &&
    candidate.values.length === 81 &&
    candidate.values.every((value) => Number.isInteger(value) && value >= 0 && value <= 9) &&
    isValidNotes(candidate.notes) &&
    Number.isInteger(candidate.selected) &&
    (candidate.selected as number) >= 0 &&
    (candidate.selected as number) < 81 &&
    typeof candidate.notesMode === 'boolean' &&
    Number.isInteger(candidate.elapsedSeconds) &&
    (candidate.elapsedSeconds as number) >= 0 &&
    typeof candidate.timerEnabled === 'boolean'
  )
}

function createSnapshot(
  values: number[],
  notes: Notes,
  selected: number,
  notesMode: boolean,
  elapsedSeconds: number,
  timerEnabled: boolean,
): BoardSnapshot {
  return {
    values: [...values],
    notes: cloneNotes(notes),
    selected,
    notesMode,
    elapsedSeconds,
    timerEnabled,
  }
}

function createNewGame(difficulty: Difficulty, seed: number) {
  const { puzzle, solution } = generatePuzzle(difficulty, seed)
  return {
    difficulty,
    seed,
    givens: puzzle.map((value) => value !== 0),
    values: [...puzzle],
    notes: cloneNotes(EMPTY_NOTES),
    solution,
    selected: puzzle.findIndex((value) => value === 0) >= 0 ? puzzle.findIndex((value) => value === 0) : 0,
    notesMode: false,
    elapsedSeconds: 0,
    timerEnabled: true,
    undoStack: [] as BoardSnapshot[],
    redoStack: [] as BoardSnapshot[],
  }
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialGame = useMemo(() => {
    const emptySeed = randomSeed()
    const fallback = createNewGame('easy', emptySeed)

    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) {
        return fallback
      }

      const parsed = JSON.parse(raw) as Partial<PersistedGame>
      if (
        parsed.version !== 1 ||
        !parsed.difficulty ||
        !Number.isInteger(parsed.seed) ||
        !Array.isArray(parsed.givens) ||
        parsed.givens.length !== 81 ||
        !Array.isArray(parsed.solution) ||
        parsed.solution.length !== 81 ||
        !Array.isArray(parsed.values) ||
        parsed.values.length !== 81 ||
        !isValidNotes(parsed.notes) ||
        !Number.isInteger(parsed.selected) ||
        (parsed.selected as number) < 0 ||
        (parsed.selected as number) >= 81 ||
        typeof parsed.notesMode !== 'boolean' ||
        !Number.isInteger(parsed.elapsedSeconds) ||
        (parsed.elapsedSeconds as number) < 0 ||
        typeof parsed.timerEnabled !== 'boolean'
      ) {
        return fallback
      }

      const undoStack = Array.isArray(parsed.undoStack)
        ? parsed.undoStack.filter(isValidSnapshot).map((snapshot) => ({
            ...snapshot,
            values: [...snapshot.values],
            notes: cloneNotes(snapshot.notes),
          }))
        : []

      const redoStack = Array.isArray(parsed.redoStack)
        ? parsed.redoStack.filter(isValidSnapshot).map((snapshot) => ({
            ...snapshot,
            values: [...snapshot.values],
            notes: cloneNotes(snapshot.notes),
          }))
        : []

      return {
        difficulty: parsed.difficulty as Difficulty,
        seed: Number(parsed.seed),
        givens: parsed.givens.map(Boolean),
        solution: parsed.solution.map((value) => (Number.isInteger(value) ? Number(value) : 0)),
        values: parsed.values.map((value) => (Number.isInteger(value) ? Number(value) : 0)),
        notes: cloneNotes(parsed.notes),
        selected: Number(parsed.selected),
        notesMode: Boolean(parsed.notesMode),
        elapsedSeconds: Number(parsed.elapsedSeconds),
        timerEnabled: Boolean(parsed.timerEnabled),
        undoStack,
        redoStack,
      }
    } catch {
      return fallback
    }
  }, [])

  const [difficulty, setDifficulty] = useState<Difficulty>(initialGame.difficulty)
  const [seed, setSeed] = useState<number>(initialGame.seed)
  const [givens, setGivens] = useState<boolean[]>(initialGame.givens)
  const [solution, setSolution] = useState<number[]>(initialGame.solution)
  const [values, setValues] = useState<number[]>(initialGame.values)
  const [notes, setNotes] = useState<Notes>(initialGame.notes)
  const [selected, setSelected] = useState<number>(initialGame.selected)
  const [notesMode, setNotesMode] = useState<boolean>(initialGame.notesMode)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(initialGame.elapsedSeconds)
  const [timerEnabled, setTimerEnabled] = useState<boolean>(initialGame.timerEnabled)
  const [undoStack, setUndoStack] = useState<BoardSnapshot[]>(initialGame.undoStack)
  const [redoStack, setRedoStack] = useState<BoardSnapshot[]>(initialGame.redoStack)

  const conflicts = useMemo(() => findConflicts(values), [values])
  const solved = useMemo(
    () => conflicts.size === 0 && values.every((value, index) => value !== 0 && value === solution[index]),
    [conflicts, solution, values],
  )

  const pushUndo = () => {
    setUndoStack((previous) => [
      ...previous.slice(Math.max(0, previous.length - 199)),
      createSnapshot(values, notes, selected, notesMode, elapsedSeconds, timerEnabled),
    ])
    setRedoStack([])
  }

  const applyState = (snapshot: BoardSnapshot) => {
    setValues([...snapshot.values])
    setNotes(cloneNotes(snapshot.notes))
    setSelected(snapshot.selected)
    setNotesMode(snapshot.notesMode)
    setElapsedSeconds(snapshot.elapsedSeconds)
    setTimerEnabled(snapshot.timerEnabled)
  }

  const resetGame = (nextDifficulty: Difficulty, nextSeed = randomSeed()) => {
    const game = createNewGame(nextDifficulty, nextSeed)
    setDifficulty(game.difficulty)
    setSeed(game.seed)
    setGivens(game.givens)
    setSolution(game.solution)
    setValues(game.values)
    setNotes(game.notes)
    setSelected(game.selected)
    setNotesMode(game.notesMode)
    setElapsedSeconds(game.elapsedSeconds)
    setTimerEnabled(game.timerEnabled)
    setUndoStack([])
    setRedoStack([])
  }

  const setCellValue = (index: number, value: number) => {
    if (givens[index]) {
      return
    }

    if (notesMode && value !== 0 && values[index] === 0) {
      pushUndo()
      setNotes((previous) => {
        const next = cloneNotes(previous)
        const current = next[index]
        next[index] = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value].sort((a, b) => a - b)
        return next
      })
      return
    }

    if (values[index] === value) {
      return
    }

    pushUndo()
    setValues((previous) => {
      const next = [...previous]
      next[index] = value
      return next
    })
    setNotes((previous) => {
      const next = cloneNotes(previous)
      next[index] = []
      return next
    })
  }

  const clearCell = (index: number) => {
    if (givens[index] || values[index] === 0) {
      return
    }
    pushUndo()
    setValues((previous) => {
      const next = [...previous]
      next[index] = 0
      return next
    })
  }

  const moveSelection = (dr: number, dc: number) => {
    const row = Math.floor(selected / 9)
    const col = selected % 9
    const nextRow = (row + dr + 9) % 9
    const nextCol = (col + dc + 9) % 9
    setSelected(nextRow * 9 + nextCol)
  }

  const moveLinear = (delta: number) => {
    setSelected((previous) => (previous + delta + 81) % 81)
  }

  const runUndo = () => {
    setUndoStack((previous) => {
      const snapshot = previous.at(-1)
      if (!snapshot) {
        return previous
      }
      setRedoStack((redoPrevious) => [...redoPrevious, createSnapshot(values, notes, selected, notesMode, elapsedSeconds, timerEnabled)])
      applyState(snapshot)
      return previous.slice(0, -1)
    })
  }

  const runRedo = () => {
    setRedoStack((previous) => {
      const snapshot = previous.at(-1)
      if (!snapshot) {
        return previous
      }
      setUndoStack((undoPrevious) => [...undoPrevious, createSnapshot(values, notes, selected, notesMode, elapsedSeconds, timerEnabled)])
      applyState(snapshot)
      return previous.slice(0, -1)
    })
  }

  const exportGame = () => {
    const data: PersistedGame = {
      version: 1,
      difficulty,
      seed,
      givens,
      solution,
      values,
      notes,
      selected,
      notesMode,
      elapsedSeconds,
      timerEnabled,
      undoStack,
      redoStack,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gnome-sudoku-${difficulty}-${seed}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importGame = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Partial<PersistedGame>
      if (
        parsed.version !== 1 ||
        !parsed.difficulty ||
        !Number.isInteger(parsed.seed) ||
        !Array.isArray(parsed.givens) ||
        parsed.givens.length !== 81 ||
        !Array.isArray(parsed.values) ||
        parsed.values.length !== 81 ||
        !isValidNotes(parsed.notes) ||
        !Array.isArray(parsed.solution) ||
        parsed.solution.length !== 81
      ) {
        throw new Error('Invalid import format')
      }

      const importedSolution = parsed.solution.map((value) => Number(value) || 0)
      const normalizedSolution = importedSolution.every((value) => value >= 1 && value <= 9)
        ? importedSolution
        : solveSudoku(parsed.values.map((value) => Number(value) || 0))

      if (!normalizedSolution) {
        throw new Error('No valid solution in imported game')
      }

      setDifficulty(parsed.difficulty as Difficulty)
      setSeed(Number(parsed.seed))
      setGivens(parsed.givens.map(Boolean))
      setSolution(normalizedSolution)
      setValues(parsed.values.map((value) => Number(value) || 0))
      setNotes(cloneNotes(parsed.notes))
      setSelected(
        Number.isInteger(parsed.selected) && (parsed.selected as number) >= 0 && (parsed.selected as number) < 81
          ? (parsed.selected as number)
          : 0,
      )
      setNotesMode(Boolean(parsed.notesMode))
      setElapsedSeconds(Number.isInteger(parsed.elapsedSeconds) ? Math.max(0, parsed.elapsedSeconds as number) : 0)
      setTimerEnabled(typeof parsed.timerEnabled === 'boolean' ? parsed.timerEnabled : true)
      setUndoStack(Array.isArray(parsed.undoStack) ? parsed.undoStack.filter(isValidSnapshot) : [])
      setRedoStack(Array.isArray(parsed.redoStack) ? parsed.redoStack.filter(isValidSnapshot) : [])
    } catch {
      window.alert('Import failed. Please choose a valid GNOME Sudoku Web JSON file.')
    } finally {
      event.target.value = ''
    }
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const data: PersistedGame = {
        version: 1,
        difficulty,
        seed,
        givens,
        solution,
        values,
        notes,
        selected,
        notesMode,
        elapsedSeconds,
        timerEnabled,
        undoStack,
        redoStack,
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    }, 250)

    return () => window.clearTimeout(timerId)
  }, [
    difficulty,
    elapsedSeconds,
    givens,
    notes,
    notesMode,
    redoStack,
    seed,
    selected,
    solution,
    timerEnabled,
    undoStack,
    values,
  ])

  useEffect(() => {
    if (!timerEnabled || solved) {
      return
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1)
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [solved, timerEnabled])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement && target.type === 'file') {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          runRedo()
        } else {
          runUndo()
        }
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        runRedo()
        return
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          moveSelection(-1, 0)
          return
        case 'ArrowDown':
          event.preventDefault()
          moveSelection(1, 0)
          return
        case 'ArrowLeft':
          event.preventDefault()
          moveSelection(0, -1)
          return
        case 'ArrowRight':
          event.preventDefault()
          moveSelection(0, 1)
          return
        case 'Tab':
          event.preventDefault()
          moveLinear(event.shiftKey ? -1 : 1)
          return
        case 'Backspace':
        case 'Delete':
          event.preventDefault()
          clearCell(selected)
          return
        case 'n':
        case 'N':
          event.preventDefault()
          setNotesMode((previous) => !previous)
          return
        default:
          break
      }

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault()
        setCellValue(selected, Number(event.key))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearCell, moveLinear, moveSelection, runRedo, runUndo, selected, setCellValue])

  return (
    <main className="app">
      <header className="titlebar">
        <h1>GNOME Sudoku Web</h1>
        <p>Adwaita-inspired Sudoku for your browser.</p>
      </header>

      <section className="controls" aria-label="Game controls">
        <label>
          Difficulty
          <select
            aria-label="Select difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <button type="button" onClick={() => resetGame(difficulty)} aria-label="Start new game">
          New game
        </button>

        <button type="button" onClick={() => setNotesMode((previous) => !previous)} aria-label="Toggle notes mode">
          Notes: {notesMode ? 'On' : 'Off'}
        </button>

        <button type="button" onClick={runUndo} disabled={undoStack.length === 0} aria-label="Undo move">
          Undo
        </button>

        <button type="button" onClick={runRedo} disabled={redoStack.length === 0} aria-label="Redo move">
          Redo
        </button>

        <button type="button" onClick={exportGame} aria-label="Export game as JSON">
          Export
        </button>

        <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Import game from JSON">
          Import
        </button>

        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="application/json"
          onChange={importGame}
          aria-label="Import game file"
        />

        <label className="timer-toggle">
          <input
            type="checkbox"
            checked={timerEnabled}
            onChange={(event) => setTimerEnabled(event.target.checked)}
            aria-label="Enable timer"
          />
          Timer
        </label>

        <div className="timer" aria-live="polite" aria-label="Elapsed time">
          {formatTime(elapsedSeconds)}
        </div>
      </section>

      <section className="meta" aria-label="Puzzle metadata">
        <span>Seed: {seed}</span>
        <span>Difficulty: {difficulty}</span>
        <span>{solved ? 'Solved ✓' : 'In progress'}</span>
      </section>

      <section className="board" role="grid" aria-label="Sudoku board">
        {values.map((value, index) => {
          const row = Math.floor(index / 9)
          const col = index % 9
          const selectedCell = index === selected
          const given = givens[index]
          const conflict = conflicts.has(index)
          const cellNotes = notes[index]

          const classes = [
            'cell',
            selectedCell ? 'selected' : '',
            given ? 'given' : '',
            conflict ? 'conflict' : '',
            Math.floor(row / 3) === 2 ? 'box-bottom' : '',
            Math.floor(col / 3) === 2 ? 'box-right' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              className={classes}
              onClick={() => setSelected(index)}
              aria-label={`Row ${row + 1} Column ${col + 1}${given ? ' given' : ' editable'}`}
              aria-selected={selectedCell}
            >
              {value !== 0 ? <span>{value}</span> : <span className="notes">{Array.from({ length: 9 }, (_, i) => (cellNotes.includes(i + 1) ? i + 1 : '·')).join(' ')}</span>}
            </button>
          )
        })}
      </section>

      <section className="number-pad" aria-label="Number controls">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => setCellValue(selected, number)}
            aria-label={`Enter ${number}`}
          >
            {number}
          </button>
        ))}
        <button type="button" onClick={() => clearCell(selected)} aria-label="Clear selected cell">
          Clear
        </button>
      </section>

      <p className="help">
        Keyboard: Arrows to move, 1-9 to enter, Backspace/Delete to clear, Tab/Shift+Tab to change focus, N for notes,
        Ctrl/Cmd+Z undo, Ctrl/Cmd+Y redo.
      </p>
    </main>
  )
}

export default App
