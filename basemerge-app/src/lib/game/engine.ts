import { TARGET_VALUE } from "./tokens";

export type Board = number[];
export type Direction = "up" | "down" | "left" | "right";

export const BOARD_SIZE = 4;
const INITIAL_TILES = 2;

export function createInitialBoard(): Board {
  let board = Array(BOARD_SIZE * BOARD_SIZE).fill(0);
  for (let i = 0; i < INITIAL_TILES; i += 1) {
    board = spawnRandomTile(board);
  }
  return board;
}

export function chunkBoard(board: Board): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < BOARD_SIZE; i += 1) {
    rows.push(board.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE));
  }
  return rows;
}

export function flattenBoard(matrix: number[][]): Board {
  return matrix.flat();
}

export function spawnRandomTile(board: Board): Board {
  const emptyIndices = board
    .map((value, index) => ({ value, index }))
    .filter((cell) => cell.value === 0)
    .map((cell) => cell.index);

  if (emptyIndices.length === 0) {
    return board;
  }

  const targetIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  const nextValue = Math.random() < 0.9 ? 2 : 4;
  const nextBoard = board.slice();
  nextBoard[targetIndex] = nextValue;
  return nextBoard;
}

type SlideResult = {
  row: number[];
  gained: number;
  moved: boolean;
};

function slideRowLeft(row: number[]): SlideResult {
  const filtered = row.filter((value) => value !== 0);
  const merged: number[] = [];
  let gained = 0;
  let moved = false;

  for (let i = 0; i < filtered.length; i += 1) {
    if (filtered[i] === filtered[i + 1]) {
      const value = filtered[i] * 2;
      merged.push(value);
      gained += value;
      i += 1;
      moved = true;
    } else {
      merged.push(filtered[i]);
    }
  }

  while (merged.length < BOARD_SIZE) {
    merged.push(0);
  }

  if (!moved) {
    moved = merged.some((value, index) => value !== row[index]);
  }

  return { row: merged, gained, moved };
}

function rotateClockwise(matrix: number[][]): number[][] {
  const rotated = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      rotated[col][BOARD_SIZE - row - 1] = matrix[row][col];
    }
  }
  return rotated;
}

function rotateCounterClockwise(matrix: number[][]): number[][] {
  const rotated = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      rotated[BOARD_SIZE - col - 1][row] = matrix[row][col];
    }
  }
  return rotated;
}

export type MoveResult = {
  board: Board;
  moved: boolean;
  gained: number;
};

export function moveBoard(board: Board, direction: Direction): MoveResult {
  let matrix = chunkBoard(board);
  let moved = false;
  let gained = 0;

  switch (direction) {
    case "up":
      matrix = rotateCounterClockwise(matrix);
      break;
    case "down":
      matrix = rotateClockwise(matrix);
      break;
    case "right":
      matrix = matrix.map((row) => row.slice().reverse());
      break;
    default:
    // left nothing
  }

  const newMatrix = matrix.map((row) => {
    const { row: nextRow, gained: rowGain, moved: rowMoved } = slideRowLeft(row);
    if (rowMoved) {
      moved = true;
    }
    gained += rowGain;
    return nextRow;
  });

  let finalMatrix = newMatrix;

  switch (direction) {
    case "up":
      finalMatrix = rotateClockwise(newMatrix);
      break;
    case "down":
      finalMatrix = rotateCounterClockwise(newMatrix);
      break;
    case "right":
      finalMatrix = newMatrix.map((row) => row.slice().reverse());
      break;
    default:
    // left nothing
  }

  return {
    board: flattenBoard(finalMatrix),
    moved,
    gained,
  };
}

export function hasMoves(board: Board): boolean {
  if (board.some((value) => value === 0)) {
    return true;
  }

  const matrix = chunkBoard(board);

  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const value = matrix[r][c];
      if (
        (r < BOARD_SIZE - 1 && matrix[r + 1][c] === value) ||
        (c < BOARD_SIZE - 1 && matrix[r][c + 1] === value)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function getHighestTile(board: Board): number {
  return Math.max(...board);
}

export function isVictory(board: Board): boolean {
  return getHighestTile(board) >= TARGET_VALUE;
}
