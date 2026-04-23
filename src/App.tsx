import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Difficulty = 'easy' | 'medium' | 'hard'
type CellValue = number | null

type Coordinates = {
  row: number
  col: number
}

type HistoryEntry = {
  values: CellValue[][]
  notes: number[][][]
  selected: Coordinates
}

type GameState = {
  difficulty: Difficulty
  puzzleId: string
  givens: number[][]
  values: CellValue[][]
  notes: number[][][]
  selected: Coordinates
  notesMode: boolean
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
  timerEnabled: boolean
  elapsedSeconds: number
}

type PersistedGameState = GameState & {
  version: 1
  savedAt: number
}

const STORAGE_KEY = 'gnome-sudoku-web-state-v1'

const PUZZLES: Record<Difficulty, Array<{ id: string; grid: number[][] }>> = {
  easy: [
    {
      id: 'easy-1',
      grid: [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
      ],
    },
    {
      id: 'easy-2',
      grid: [
        [0, 2, 0, 6, 0, 8, 0, 0, 0],
        [5, 8, 0, 0, 0, 9, 7, 0, 0],
        [0, 0, 0, 0, 4, 0, 0, 0, 0],
        [3, 7, 0, 0, 0, 0, 5, 0, 0],
        [6, 0, 0, 0, 0, 0, 0, 0, 4],
        [0, 0, 8, 0, 0, 0, 0, 1, 3],
        [0, 0, 0, 0, 2, 0, 0, 0, 0],
        [0, 0, 9, 8, 0, 0, 0, 3, 6],
        [0, 0, 0, 3, 0, 6, 0, 9, 0],
      ],
    },
  ],
  medium: [
    {
      id: 'medium-1',
      grid: [
        [0, 0, 0, 2, 6, 0, 7, 0, 1],
        [6, 8, 0, 0, 7, 0, 0, 9, 0],
        [1, 9, 0, 0, 0, 4, 5, 0, 0],
        [8, 2, 0, 1, 0, 0, 0, 4, 0],
        [0, 0, 4, 6, 0, 2, 9, 0, 0],
        [0, 5, 0, 0, 0, 3, 0, 2, 8],
        [0, 0, 9, 3, 0, 0, 0, 7, 4],
        [0, 4, 0, 0, 5, 0, 0, 3, 6],
        [7, 0, 3, 0, 1, 8, 0, 0, 0],
      ],
    },
    {
      id: 'medium-2',
      grid: [
        [0, 0, 0, 0, 0, 0, 2, 0, 0],
        [0, 8, 0, 0, 0, 7, 0, 9, 0],
        [6, 0, 2, 0, 0, 0, 5, 0, 0],
        [0, 7, 0, 0, 6, 0, 0, 0, 0],
        [0, 0, 0, 9, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 2, 0, 0, 4, 0],
        [0, 0, 5, 0, 0, 0, 6, 0, 3],
        [0, 9, 0, 4, 0, 0, 0, 7, 0],
        [0, 0, 6, 0, 0, 0, 0, 0, 0],
      ],
    },
  ],
  hard: [
    {
      id: 'hard-1',
      grid: [
        [0, 0, 0, 0, 0, 0, 0, 1, 2],
        [0, 0, 0, 0, 0, 7, 0, 0, 0],
        [0, 0, 1, 0, 9, 0, 0, 0, 0],
        [0, 0, 0, 7, 0, 0, 0, 0, 0],
        [3, 0, 0, 0, 0, 0, 0, 0, 5],
        [0, 0, 0, 0, 0, 2, 0, 0, 0],
        [0, 0, 0, 0, 3, 0, 7, 0, 0],
        [0, 0, 0, 4, 0, 0, 0, 0, 0],
        [8, 2, 0, 0, 0, 0, 0, 0, 0],
      ],
    },
    {
      id: 'hard-2',
      grid: [
        [0, 0, 0, 6, 0, 0, 4, 0, 0],
        [7, 0, 0, 0, 0, 3, 6, 0, 0],
        [0, 0, 0, 0, 9, 1, 0, 8, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 5, 0, 1, 8, 0, 0, 0, 3],
        [0, 0, 0, 3, 0, 6, 0, 4, 5],
        [0, 4, 0, 2, 0, 0, 0, 6, 0],
        [9, 0, 3, 0, 0, 0, 0, 0, 0],
        [0, 2, 0, 0, 0, 0, 1, 0, 0],
      ],
    },
  ],
}

const cloneGrid = (grid: CellValue[][]): CellValue[][] => grid.map((row) => [...row])
const cloneNumberGrid = (grid: number[][]): number[][] => grid.map((row) => [...row])
const cloneNotes = (notes: number[][][]): number[][][] =>
  notes.map((row) => row.map((cell) => [...cell]))

const createEmptyNotes = (): number[][][] =>
  Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))

const gridToValues = (grid: number[][]): CellValue[][] =>
  grid.map((row) => row.map((value) => (value === 0 ? null : value)))

const findEmpty = (grid: number[][]): Coordinates | null => {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (grid[row][col] === 0) {
        return { row, col }
      }
    }
  }
  return null
}

const isSafe = (grid: number[][], row: number, col: number, value: number): boolean => {
  for (let i = 0; i < 9; i += 1) {
    if (grid[row][i] === value || grid[i][col] === value) {
      return false
    }
  }

  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if (grid[r][c] === value) {
        return false
      }
    }
  }

  return true
}

const countSolutions = (grid: number[][], limit = 2): number => {
  const empty = findEmpty(grid)
  if (!empty) {
    return 1
  }

  let count = 0
  for (let value = 1; value <= 9; value += 1) {
    if (!isSafe(grid, empty.row, empty.col, value)) {
      continue
    }

    grid[empty.row][empty.col] = value
    count += countSolutions(grid, limit)
    if (count >= limit) {
      grid[empty.row][empty.col] = 0
      return count
    }
    grid[empty.row][empty.col] = 0
  }

  return count
}

const hasUniqueSolution = (grid: number[][]): boolean => countSolutions(cloneNumberGrid(grid)) === 1

const pickPuzzle = (difficulty: Difficulty): { id: string; grid: number[][] } => {
  const candidates = PUZZLES[difficulty].filter((entry) => hasUniqueSolution(entry.grid))
  const source = candidates.length > 0 ? candidates : PUZZLES[difficulty]
  return source[Math.floor(Math.random() * source.length)]
}

const createHistoryEntry = (state: GameState): HistoryEntry => ({
  values: cloneGrid(state.values),
  notes: cloneNotes(state.notes),
  selected: { ...state.selected },
})

const createNewGame = (difficulty: Difficulty): GameState => {
  const puzzle = pickPuzzle(difficulty)
  const givens = cloneNumberGrid(puzzle.grid)
  return {
    difficulty,
    puzzleId: puzzle.id,
    givens,
    values: gridToValues(givens),
    notes: createEmptyNotes(),
    selected: { row: 0, col: 0 },
    notesMode: false,
    undoStack: [],
    redoStack: [],
    timerEnabled: true,
    elapsedSeconds: 0,
  }
}

const clampSelection = (selected: Coordinates): Coordinates => ({
  row: Math.max(0, Math.min(8, selected.row)),
  col: Math.max(0, Math.min(8, selected.col)),
})

const toPersisted = (state: GameState): PersistedGameState => ({
  ...state,
  version: 1,
  savedAt: Date.now(),
  givens: cloneNumberGrid(state.givens),
  values: cloneGrid(state.values),
  notes: cloneNotes(state.notes),
  undoStack: state.undoStack.map((entry) => ({
    values: cloneGrid(entry.values),
    notes: cloneNotes(entry.notes),
    selected: clampSelection(entry.selected),
  })),
  redoStack: state.redoStack.map((entry) => ({
    values: cloneGrid(entry.values),
    notes: cloneNotes(entry.notes),
    selected: clampSelection(entry.selected),
  })),
  selected: clampSelection(state.selected),
})

const normalizeValuesGrid = (grid: unknown): CellValue[][] | null => {
  if (!Array.isArray(grid) || grid.length !== 9) {
    return null
  }
  const rows = grid.map((row) => {
    if (!Array.isArray(row) || row.length !== 9) {
      return null
    }
    const mapped = row.map((value) => {
      if (value === null || value === 0) {
        return null
      }
      if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9) {
        return value
      }
      return null
    })
    return mapped
  })
  if (rows.some((row) => row === null)) {
    return null
  }
  return rows as CellValue[][]
}

const normalizeNumberGrid = (grid: unknown): number[][] | null => {
  if (!Array.isArray(grid) || grid.length !== 9) {
    return null
  }
  const rows = grid.map((row) => {
    if (!Array.isArray(row) || row.length !== 9) {
      return null
    }
    const mapped = row.map((value) => {
      if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 9) {
        return value
      }
      return null
    })
    if (mapped.some((value) => value === null)) {
      return null
    }
    return mapped as number[]
  })
  if (rows.some((row) => row === null)) {
    return null
  }
  return rows as number[][]
}

const normalizeNotes = (notes: unknown): number[][][] | null => {
  if (!Array.isArray(notes) || notes.length !== 9) {
    return null
  }
  const rows = notes.map((row) => {
    if (!Array.isArray(row) || row.length !== 9) {
      return null
    }
    const mappedRow = row.map((cell) => {
      if (!Array.isArray(cell)) {
        return null
      }
      const deduplicated = Array.from(
        new Set(
          cell.filter(
            (value): value is number =>
              typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9,
          ),
        ),
      )
      deduplicated.sort((a, b) => a - b)
      return deduplicated
    })
    if (mappedRow.some((cell) => cell === null)) {
      return null
    }
    return mappedRow as number[][]
  })
  if (rows.some((row) => row === null)) {
    return null
  }
  return rows as number[][][]
}

const normalizeHistoryStack = (stack: unknown): HistoryEntry[] | null => {
  if (!Array.isArray(stack)) {
    return null
  }

  const normalized: HistoryEntry[] = []
  for (const entry of stack) {
    if (!entry || typeof entry !== 'object') {
      return null
    }

    const item = entry as {
      values?: unknown
      notes?: unknown
      selected?: unknown
    }

    const values = normalizeValuesGrid(item.values)
    const notes = normalizeNotes(item.notes)
    const selectedObject = item.selected

    if (!values || !notes || !selectedObject || typeof selectedObject !== 'object') {
      return null
    }

    const selectedRaw = selectedObject as { row?: unknown; col?: unknown }
    if (
      typeof selectedRaw.row !== 'number' ||
      typeof selectedRaw.col !== 'number' ||
      !Number.isInteger(selectedRaw.row) ||
      !Number.isInteger(selectedRaw.col)
    ) {
      return null
    }

    normalized.push({
      values,
      notes,
      selected: clampSelection({ row: selectedRaw.row, col: selectedRaw.col }),
    })
  }

  return normalized
}

const loadPersistedState = (): GameState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<PersistedGameState>

    const difficulty =
      parsed.difficulty === 'easy' || parsed.difficulty === 'medium' || parsed.difficulty === 'hard'
        ? parsed.difficulty
        : null

    const givens = normalizeNumberGrid(parsed.givens)
    const values = normalizeValuesGrid(parsed.values)
    const notes = normalizeNotes(parsed.notes)
    const undoStack = normalizeHistoryStack(parsed.undoStack ?? [])
    const redoStack = normalizeHistoryStack(parsed.redoStack ?? [])

    if (!difficulty || !givens || !values || !notes || !undoStack || !redoStack) {
      return null
    }

    const selectedRaw = parsed.selected
    const selected =
      selectedRaw &&
      typeof selectedRaw === 'object' &&
      typeof selectedRaw.row === 'number' &&
      typeof selectedRaw.col === 'number'
        ? clampSelection({ row: selectedRaw.row, col: selectedRaw.col })
        : { row: 0, col: 0 }

    const notesMode = Boolean(parsed.notesMode)
    const timerEnabled = parsed.timerEnabled !== false
    const elapsedSeconds = Math.max(0, Number.isFinite(parsed.elapsedSeconds) ? Number(parsed.elapsedSeconds) : 0)
    const savedAt = Number.isFinite(parsed.savedAt) ? Number(parsed.savedAt) : Date.now()

    const adjustedElapsed =
      timerEnabled && savedAt > 0
        ? elapsedSeconds + Math.max(0, Math.floor((Date.now() - savedAt) / 1000))
        : elapsedSeconds

    const normalizedValues = cloneGrid(values)
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (givens[row][col] !== 0) {
          normalizedValues[row][col] = givens[row][col]
        }
      }
    }

    return {
      difficulty,
      puzzleId: typeof parsed.puzzleId === 'string' ? parsed.puzzleId : `${difficulty}-imported`,
      givens,
      values: normalizedValues,
      notes,
      selected,
      notesMode,
      undoStack,
      redoStack,
      timerEnabled,
      elapsedSeconds: adjustedElapsed,
    }
  } catch {
    return null
  }
}

const formatTime = (seconds: number): string => {
  const hh = Math.floor(seconds / 3600)
  const mm = Math.floor((seconds % 3600) / 60)
  const ss = seconds % 60

  if (hh > 0) {
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const toIndex = (row: number, col: number): number => row * 9 + col

function App() {
  const [game, setGame] = useState<GameState>(() => loadPersistedState() ?? createNewGame('easy'))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const selectedValue = game.values[game.selected.row][game.selected.col]

  useEffect(() => {
    const persisted = toPersisted(game)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  }, [game])

  useEffect(() => {
    if (!game.timerEnabled) {
      return
    }

    const id = window.setInterval(() => {
      setGame((previous) => ({
        ...previous,
        elapsedSeconds: previous.elapsedSeconds + 1,
      }))
    }, 1000)

    return () => window.clearInterval(id)
  }, [game.timerEnabled])

  const conflicts = useMemo(() => {
    const conflictKeys = new Set<string>()

    const addDuplicates = (cells: Coordinates[]) => {
      const groups = new Map<number, Coordinates[]>()
      for (const cell of cells) {
        const value = game.values[cell.row][cell.col]
        if (!value) {
          continue
        }
        const group = groups.get(value) ?? []
        group.push(cell)
        groups.set(value, group)
      }

      for (const duplicateCells of groups.values()) {
        if (duplicateCells.length <= 1) {
          continue
        }
        for (const cell of duplicateCells) {
          conflictKeys.add(`${cell.row}-${cell.col}`)
        }
      }
    }

    for (let row = 0; row < 9; row += 1) {
      addDuplicates(Array.from({ length: 9 }, (_, col) => ({ row, col })))
    }

    for (let col = 0; col < 9; col += 1) {
      addDuplicates(Array.from({ length: 9 }, (_, row) => ({ row, col })))
    }

    for (let boxRow = 0; boxRow < 3; boxRow += 1) {
      for (let boxCol = 0; boxCol < 3; boxCol += 1) {
        const cells: Coordinates[] = []
        for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
          for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
            cells.push({ row, col })
          }
        }
        addDuplicates(cells)
      }
    }

    return conflictKeys
  }, [game.values])

  const updateBoardState = (updater: (draft: GameState) => boolean): void => {
    setGame((previous) => {
      const draft: GameState = {
        ...previous,
        givens: cloneNumberGrid(previous.givens),
        values: cloneGrid(previous.values),
        notes: cloneNotes(previous.notes),
        selected: { ...previous.selected },
        undoStack: [...previous.undoStack],
        redoStack: [...previous.redoStack],
      }

      const changed = updater(draft)
      if (!changed) {
        return previous
      }

      draft.undoStack.push(createHistoryEntry(previous))
      draft.redoStack = []
      return draft
    })
  }

  const setSelection = (row: number, col: number): void => {
    setGame((previous) => ({
      ...previous,
      selected: clampSelection({ row, col }),
    }))
  }

  const moveSelection = (rowDelta: number, colDelta: number): void => {
    setGame((previous) => ({
      ...previous,
      selected: clampSelection({
        row: previous.selected.row + rowDelta,
        col: previous.selected.col + colDelta,
      }),
    }))
  }

  const moveSelectionLinear = (delta: number): void => {
    setGame((previous) => {
      const index = toIndex(previous.selected.row, previous.selected.col)
      const wrapped = (index + delta + 81) % 81
      return {
        ...previous,
        selected: { row: Math.floor(wrapped / 9), col: wrapped % 9 },
      }
    })
  }

  const setDigit = (value: number): void => {
    updateBoardState((draft) => {
      const { row, col } = draft.selected
      if (draft.givens[row][col] !== 0) {
        return false
      }

      if (draft.notesMode) {
        const notes = new Set(draft.notes[row][col])
        if (notes.has(value)) {
          notes.delete(value)
        } else {
          notes.add(value)
        }
        draft.notes[row][col] = Array.from(notes).sort((a, b) => a - b)
        return true
      }

      if (draft.values[row][col] === value) {
        return false
      }
      draft.values[row][col] = value
      draft.notes[row][col] = []
      return true
    })
  }

  const clearCell = (): void => {
    updateBoardState((draft) => {
      const { row, col } = draft.selected
      if (draft.givens[row][col] !== 0) {
        return false
      }

      if (draft.notesMode) {
        if (draft.notes[row][col].length === 0) {
          return false
        }
        draft.notes[row][col] = []
        return true
      }

      const hadValue = draft.values[row][col] !== null
      const hadNotes = draft.notes[row][col].length > 0
      if (!hadValue && !hadNotes) {
        return false
      }

      draft.values[row][col] = null
      draft.notes[row][col] = []
      return true
    })
  }

  const undo = (): void => {
    setGame((previous) => {
      if (previous.undoStack.length === 0) {
        return previous
      }

      const entry = previous.undoStack[previous.undoStack.length - 1]
      return {
        ...previous,
        values: cloneGrid(entry.values),
        notes: cloneNotes(entry.notes),
        selected: { ...entry.selected },
        undoStack: previous.undoStack.slice(0, -1),
        redoStack: [...previous.redoStack, createHistoryEntry(previous)],
      }
    })
  }

  const redo = (): void => {
    setGame((previous) => {
      if (previous.redoStack.length === 0) {
        return previous
      }

      const entry = previous.redoStack[previous.redoStack.length - 1]
      return {
        ...previous,
        values: cloneGrid(entry.values),
        notes: cloneNotes(entry.notes),
        selected: { ...entry.selected },
        undoStack: [...previous.undoStack, createHistoryEntry(previous)],
        redoStack: previous.redoStack.slice(0, -1),
      }
    })
  }

  const handleNewGame = (difficulty: Difficulty): void => {
    setGame((previous) => {
      const next = createNewGame(difficulty)
      return {
        ...next,
        notesMode: previous.notesMode,
        timerEnabled: previous.timerEnabled,
      }
    })
  }

  const toggleTimer = (): void => {
    setGame((previous) => ({
      ...previous,
      timerEnabled: !previous.timerEnabled,
    }))
  }

  const handleExport = (): void => {
    const payload = JSON.stringify(toPersisted(game), null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `gnome-sudoku-${game.difficulty}-${game.puzzleId}.json`
    link.click()

    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PersistedGameState
        const normalized = loadPersistedStateFromImport(parsed)
        if (!normalized) {
          window.alert('Invalid save file.')
          return
        }
        setGame(normalized)
      } catch {
        window.alert('Unable to import save file.')
      } finally {
        event.target.value = ''
      }
    }

    reader.readAsText(file)
  }

  const handleBoardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const key = event.key

    const modifier = event.ctrlKey || event.metaKey
    if (modifier && key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) {
        redo()
      } else {
        undo()
      }
      return
    }

    if (modifier && key.toLowerCase() === 'y') {
      event.preventDefault()
      redo()
      return
    }

    if (key === 'ArrowUp') {
      event.preventDefault()
      moveSelection(-1, 0)
      return
    }

    if (key === 'ArrowDown') {
      event.preventDefault()
      moveSelection(1, 0)
      return
    }

    if (key === 'ArrowLeft') {
      event.preventDefault()
      moveSelection(0, -1)
      return
    }

    if (key === 'ArrowRight') {
      event.preventDefault()
      moveSelection(0, 1)
      return
    }

    if (key === 'Tab') {
      event.preventDefault()
      moveSelectionLinear(event.shiftKey ? -1 : 1)
      return
    }

    if (key === 'Backspace' || key === 'Delete' || key === '0') {
      event.preventDefault()
      clearCell()
      return
    }

    if (key.toLowerCase() === 'n') {
      event.preventDefault()
      setGame((previous) => ({
        ...previous,
        notesMode: !previous.notesMode,
      }))
      return
    }

    if (/^[1-9]$/.test(key)) {
      event.preventDefault()
      setDigit(Number(key))
    }
  }

  const isRelatedCell = (row: number, col: number): boolean => {
    const sameRow = row === game.selected.row
    const sameCol = col === game.selected.col
    const sameBox =
      Math.floor(row / 3) === Math.floor(game.selected.row / 3) &&
      Math.floor(col / 3) === Math.floor(game.selected.col / 3)
    return sameRow || sameCol || sameBox
  }

  const isSolved = useMemo(
    () =>
      game.values.every((row) => row.every((value) => value !== null)) &&
      game.values.every((_, rowIndex) =>
        game.values[rowIndex].every((__, colIndex) => !conflicts.has(`${rowIndex}-${colIndex}`)),
      ),
    [conflicts, game.values],
  )

  return (
    <main className="app-shell">
      <header className="toolbar" aria-label="Game controls">
        <label className="field-group">
          <span>Difficulty</span>
          <select
            value={game.difficulty}
            onChange={(event) => handleNewGame(event.target.value as Difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <button type="button" onClick={() => handleNewGame(game.difficulty)}>
          New Game
        </button>

        <button type="button" aria-pressed={game.notesMode} onClick={() => setGame((previous) => ({ ...previous, notesMode: !previous.notesMode }))}>
          Notes {game.notesMode ? 'On' : 'Off'}
        </button>

        <button type="button" onClick={undo} disabled={game.undoStack.length === 0}>
          Undo
        </button>
        <button type="button" onClick={redo} disabled={game.redoStack.length === 0}>
          Redo
        </button>

        <button type="button" aria-pressed={game.timerEnabled} onClick={toggleTimer}>
          Timer {game.timerEnabled ? 'On' : 'Off'}
        </button>

        <button type="button" onClick={handleExport}>
          Export
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileInputRef}
          className="hidden-input"
          type="file"
          accept="application/json"
          onChange={handleImport}
        />
      </header>

      <section className="status-panel">
        <div className="status-item">
          <span>Puzzle</span>
          <strong>{game.puzzleId}</strong>
        </div>
        <div className="status-item">
          <span>Time</span>
          <strong>{formatTime(game.elapsedSeconds)}</strong>
        </div>
        <div className="status-item">
          <span>Status</span>
          <strong>{isSolved ? 'Solved' : conflicts.size > 0 ? 'Conflicts' : 'In progress'}</strong>
        </div>
      </section>

      <div
        ref={boardRef}
        className="board"
        role="grid"
        tabIndex={0}
        aria-label="Sudoku board"
        onKeyDown={handleBoardKeyDown}
      >
        {game.values.map((row, rowIndex) =>
          row.map((value, colIndex) => {
            const key = `${rowIndex}-${colIndex}`
            const isSelected = game.selected.row === rowIndex && game.selected.col === colIndex
            const isGiven = game.givens[rowIndex][colIndex] !== 0
            const related = isRelatedCell(rowIndex, colIndex)
            const sameValue =
              selectedValue !== null &&
              value !== null &&
              selectedValue === value &&
              !(game.selected.row === rowIndex && game.selected.col === colIndex)
            const hasConflict = conflicts.has(key)

            return (
              <button
                type="button"
                key={key}
                className={[
                  'cell',
                  isSelected ? 'selected' : '',
                  related ? 'related' : '',
                  isGiven ? 'given' : '',
                  hasConflict ? 'conflict' : '',
                  sameValue ? 'same-value' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  setSelection(rowIndex, colIndex)
                  boardRef.current?.focus()
                }}
                aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}`}
              >
                {value ? (
                  <span className="cell-value">{value}</span>
                ) : (
                  <span className="notes-grid" aria-hidden="true">
                    {Array.from({ length: 9 }, (_, noteIndex) => {
                      const note = noteIndex + 1
                      return (
                        <span key={note} className="note-value">
                          {game.notes[rowIndex][colIndex].includes(note) ? note : ''}
                        </span>
                      )
                    })}
                  </span>
                )}
              </button>
            )
          }),
        )}
      </div>

      <section className="keypad" aria-label="Number input">
        {Array.from({ length: 9 }, (_, index) => (
          <button key={index + 1} type="button" onClick={() => setDigit(index + 1)}>
            {index + 1}
          </button>
        ))}
        <button type="button" onClick={clearCell}>
          Clear
        </button>
      </section>

      <section className="help-panel">
        <p>
          <strong>Keyboard:</strong> Arrow keys move, Tab/Shift+Tab navigate, 1-9 enter numbers, Backspace/Delete clears,
          Ctrl/Cmd+Z undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redo, N toggles notes.
        </p>
      </section>
    </main>
  )
}

const loadPersistedStateFromImport = (parsed: Partial<PersistedGameState>): GameState | null => {
  const difficulty =
    parsed.difficulty === 'easy' || parsed.difficulty === 'medium' || parsed.difficulty === 'hard'
      ? parsed.difficulty
      : null

  const givens = normalizeNumberGrid(parsed.givens)
  const values = normalizeValuesGrid(parsed.values)
  const notes = normalizeNotes(parsed.notes)
  const undoStack = normalizeHistoryStack(parsed.undoStack ?? [])
  const redoStack = normalizeHistoryStack(parsed.redoStack ?? [])

  if (!difficulty || !givens || !values || !notes || !undoStack || !redoStack) {
    return null
  }

  const selectedRaw = parsed.selected
  const selected =
    selectedRaw &&
    typeof selectedRaw === 'object' &&
    typeof selectedRaw.row === 'number' &&
    typeof selectedRaw.col === 'number'
      ? clampSelection({ row: selectedRaw.row, col: selectedRaw.col })
      : { row: 0, col: 0 }

  const normalizedValues = cloneGrid(values)
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (givens[row][col] !== 0) {
        normalizedValues[row][col] = givens[row][col]
      }
    }
  }

  return {
    difficulty,
    puzzleId: typeof parsed.puzzleId === 'string' ? parsed.puzzleId : `${difficulty}-imported`,
    givens,
    values: normalizedValues,
    notes,
    selected,
    notesMode: Boolean(parsed.notesMode),
    undoStack,
    redoStack,
    timerEnabled: parsed.timerEnabled !== false,
    elapsedSeconds: Math.max(0, Number.isFinite(parsed.elapsedSeconds) ? Number(parsed.elapsedSeconds) : 0),
  }
}

export default App
