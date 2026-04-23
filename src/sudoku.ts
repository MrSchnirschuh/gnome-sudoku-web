export type Difficulty = 'easy' | 'medium' | 'hard'
export type Grid = number[]

const SIZE = 9
const BOX = 3

const cluesByDifficulty: Record<Difficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 26,
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(values: number[], random: () => number): number[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function rowOf(index: number): number {
  return Math.floor(index / SIZE)
}

function colOf(index: number): number {
  return index % SIZE
}

export function isValidMove(grid: Grid, index: number, value: number): boolean {
  if (value < 1 || value > 9) {
    return false
  }

  const row = rowOf(index)
  const col = colOf(index)

  for (let c = 0; c < SIZE; c += 1) {
    const i = row * SIZE + c
    if (i !== index && grid[i] === value) {
      return false
    }
  }

  for (let r = 0; r < SIZE; r += 1) {
    const i = r * SIZE + col
    if (i !== index && grid[i] === value) {
      return false
    }
  }

  const boxRow = Math.floor(row / BOX) * BOX
  const boxCol = Math.floor(col / BOX) * BOX
  for (let r = 0; r < BOX; r += 1) {
    for (let c = 0; c < BOX; c += 1) {
      const i = (boxRow + r) * SIZE + (boxCol + c)
      if (i !== index && grid[i] === value) {
        return false
      }
    }
  }

  return true
}

function findEmptyCell(grid: Grid): number {
  let bestIndex = -1
  let bestCount = Number.POSITIVE_INFINITY

  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] !== 0) {
      continue
    }
    let count = 0
    for (let value = 1; value <= 9; value += 1) {
      if (isValidMove(grid, i, value)) {
        count += 1
      }
    }

    if (count < bestCount) {
      bestCount = count
      bestIndex = i
      if (count <= 1) {
        break
      }
    }
  }

  return bestIndex
}

function solveBacktracking(grid: Grid, random?: () => number): boolean {
  const emptyIndex = findEmptyCell(grid)
  if (emptyIndex === -1) {
    return true
  }

  const numbers = random ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random) : [1, 2, 3, 4, 5, 6, 7, 8, 9]

  for (const value of numbers) {
    if (!isValidMove(grid, emptyIndex, value)) {
      continue
    }
    grid[emptyIndex] = value
    if (solveBacktracking(grid, random)) {
      return true
    }
    grid[emptyIndex] = 0
  }

  return false
}

function countSolutionsInternal(grid: Grid, limit: number): number {
  const emptyIndex = findEmptyCell(grid)
  if (emptyIndex === -1) {
    return 1
  }

  let total = 0
  for (let value = 1; value <= 9; value += 1) {
    if (!isValidMove(grid, emptyIndex, value)) {
      continue
    }

    grid[emptyIndex] = value
    total += countSolutionsInternal(grid, limit)
    if (total >= limit) {
      grid[emptyIndex] = 0
      return total
    }
    grid[emptyIndex] = 0
  }

  return total
}

export function countSolutions(grid: Grid, limit = 2): number {
  return countSolutionsInternal([...grid], limit)
}

export function solveSudoku(grid: Grid): Grid | null {
  const working = [...grid]
  if (!solveBacktracking(working)) {
    return null
  }
  return working
}

export function createSolvedGrid(seed: number): Grid {
  const random = mulberry32(seed)
  const grid = new Array(81).fill(0)
  solveBacktracking(grid, random)
  return grid
}

export function findConflicts(grid: Grid): Set<number> {
  const conflicts = new Set<number>()

  const markDuplicates = (indices: number[]) => {
    const seen = new Map<number, number>()
    for (const index of indices) {
      const value = grid[index]
      if (value === 0) {
        continue
      }

      const previous = seen.get(value)
      if (previous !== undefined) {
        conflicts.add(previous)
        conflicts.add(index)
      } else {
        seen.set(value, index)
      }
    }
  }

  for (let row = 0; row < SIZE; row += 1) {
    markDuplicates(Array.from({ length: SIZE }, (_, c) => row * SIZE + c))
  }

  for (let col = 0; col < SIZE; col += 1) {
    markDuplicates(Array.from({ length: SIZE }, (_, r) => r * SIZE + col))
  }

  for (let boxRow = 0; boxRow < BOX; boxRow += 1) {
    for (let boxCol = 0; boxCol < BOX; boxCol += 1) {
      const indices: number[] = []
      for (let r = 0; r < BOX; r += 1) {
        for (let c = 0; c < BOX; c += 1) {
          indices.push((boxRow * BOX + r) * SIZE + (boxCol * BOX + c))
        }
      }
      markDuplicates(indices)
    }
  }

  return conflicts
}

export function generatePuzzle(difficulty: Difficulty, seed: number): { puzzle: Grid; solution: Grid } {
  const solution = createSolvedGrid(seed)
  const puzzle = [...solution]
  const random = mulberry32(seed ^ 0x9e3779b9)
  const order = shuffle(Array.from({ length: 81 }, (_, i) => i), random)

  const targetClues = cluesByDifficulty[difficulty]
  const targetRemovals = 81 - targetClues
  let removals = 0

  for (const index of order) {
    if (removals >= targetRemovals) {
      break
    }

    const previous = puzzle[index]
    puzzle[index] = 0
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[index] = previous
      continue
    }

    removals += 1
  }

  return { puzzle, solution }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}

export function formatTime(totalSeconds: number): string {
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
