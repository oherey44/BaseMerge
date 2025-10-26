import { useCallback, useEffect, useMemo, useState } from "react";

import {
  BOARD_SIZE,
  Direction,
  MoveResult,
  Board,
  createInitialBoard,
  getHighestTile,
  hasMoves,
  isVictory,
  moveBoard,
  spawnRandomTile,
} from "@/lib/game/engine";
import { TARGET_VALUE } from "@/lib/game/tokens";

export type GameStatus = "playing" | "won" | "over";

const STORAGE_KEY = "basemerge-best-score";
const EMPTY_BOARD = Array(BOARD_SIZE * BOARD_SIZE).fill(0);

function useBestScore(initialScore: number) {
  const [bestScore, setBestScore] = useState(initialScore);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from client storage post-mount
      setBestScore(Number(stored));
    }
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedStorage) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, String(bestScore));
  }, [bestScore, hasLoadedStorage]);

  return [bestScore, setBestScore] as const;
}

export function useBaseMergeGame() {
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [lastGain, setLastGain] = useState(0);
  const [bestScore, setBestScore] = useBestScore(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- spawn initial tiles only on the client
    setBoard(createInitialBoard());
  }, []);

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setScore(0);
    setStatus("playing");
    setLastGain(0);
  }, []);

  const applyMove = useCallback(
    (direction: Direction) => {
      if (status === "over") {
        return;
      }

      const { board: shiftedBoard, moved, gained }: MoveResult = moveBoard(board, direction);

      if (!moved) {
        return;
      }

      const nextBoard = spawnRandomTile(shiftedBoard);
      const nextScore = score + gained;
      const victory = isVictory(nextBoard);
      const stuck = !hasMoves(nextBoard);

      setBoard(nextBoard);
      setScore(nextScore);
      setLastGain(gained);
      setBestScore((prev) => Math.max(prev, nextScore));

      if (victory) {
        setStatus("won");
      } else if (stuck) {
        setStatus("over");
      } else {
        setStatus("playing");
      }
    },
    [board, score, status, setBestScore],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mapping: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };

      const direction = mapping[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      applyMove(direction);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [applyMove]);

  const grid = useMemo(() => {
    const matrix: number[][] = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      matrix.push(board.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE));
    }
    return matrix;
  }, [board]);

  const highestTile = useMemo(() => getHighestTile(board), [board]);
  const progress = Math.min(highestTile / TARGET_VALUE, 1);

  return {
    grid,
    score,
    bestScore,
    status,
    lastGain,
    highestTile,
    progress,
    applyMove,
    resetGame,
  };
}
