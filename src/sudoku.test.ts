import { describe, expect, test } from 'vitest'
import { countSolutions, findConflicts, generatePuzzle, solveSudoku } from './sudoku'

describe('sudoku logic', () => {
  test('solves a known puzzle', () => {
    const puzzle = [
      5, 3, 0, 0, 7, 0, 0, 0, 0,
      6, 0, 0, 1, 9, 5, 0, 0, 0,
      0, 9, 8, 0, 0, 0, 0, 6, 0,
      8, 0, 0, 0, 6, 0, 0, 0, 3,
      4, 0, 0, 8, 0, 3, 0, 0, 1,
      7, 0, 0, 0, 2, 0, 0, 0, 6,
      0, 6, 0, 0, 0, 0, 2, 8, 0,
      0, 0, 0, 4, 1, 9, 0, 0, 5,
      0, 0, 0, 0, 8, 0, 0, 7, 9,
    ]

    const solution = solveSudoku(puzzle)
    expect(solution).not.toBeNull()
    expect(solution?.every((value) => value >= 1 && value <= 9)).toBe(true)
    expect(countSolutions(puzzle)).toBe(1)
  })

  test('finds duplicate conflicts', () => {
    const grid = Array(81).fill(0)
    grid[0] = 5
    grid[1] = 5

    const conflicts = findConflicts(grid)
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.has(1)).toBe(true)
  })

  test('generates deterministic puzzles by seed and difficulty', () => {
    const seed = 1337
    const easyA = generatePuzzle('easy', seed)
    const easyB = generatePuzzle('easy', seed)
    const hard = generatePuzzle('hard', seed)

    expect(easyA.puzzle).toEqual(easyB.puzzle)
    expect(easyA.solution).toEqual(easyB.solution)
    expect(countSolutions(easyA.puzzle)).toBe(1)
    expect(countSolutions(hard.puzzle)).toBe(1)
    expect(easyA.puzzle.filter((v) => v !== 0).length).toBeGreaterThan(hard.puzzle.filter((v) => v !== 0).length)
  })
})
