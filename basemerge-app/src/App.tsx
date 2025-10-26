import { sdk } from "@farcaster/miniapp-sdk";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";

import { useBaseMergeGame } from "./hooks/useBaseMergeGame";
import { Direction } from "./lib/game/engine";
import { TARGET_VALUE, getTokenTier } from "./lib/game/tokens";

const API_BASE = import.meta.env.VITE_WEB_API_BASE ?? "https://base-merge.vercel.app";
const SEASON_ID = import.meta.env.VITE_SEASON_ID ?? "season-1";
const BASE_BONUS = 10000;

const CONTROL_MAP: { label: string; direction: Direction }[] = [
  { label: "↑", direction: "up" },
  { label: "↓", direction: "down" },
  { label: "←", direction: "left" },
  { label: "→", direction: "right" },
];

type LeaderboardWindow = "daily" | "season";

type LeaderboardEntry = {
  wallet: string;
  score: number;
  rank: number;
};

function App() {
  const {
    grid,
    score,
    bestScore,
    status,
    lastGain,
    highestTile,
    progress,
    applyMove,
    resetGame,
  } = useBaseMergeGame();
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const { connect, connectors, status: connectStatus } = useConnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const [leaderboardWindow, setLeaderboardWindow] = useState<LeaderboardWindow>("daily");
  const leaderboardQuery = useLeaderboard(leaderboardWindow);
  const [submitState, setSubmitState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  const finalScore = status === "won" ? score + BASE_BONUS : score;
  const canSubmitScore = isConnected && finalScore > 0 && (status === "won" || status === "over");
  const primaryConnector = connectors[0];

  const connectLabel = useMemo(() => {
    if (!primaryConnector) return "Bağlayıcı yok";
    if (connectStatus === "pending") return "Bağlanılıyor...";
    return `${primaryConnector.name} ile bağlan`;
  }, [connectStatus, primaryConnector]);

  const handleConnect = () => {
    if (!primaryConnector || connectStatus === "pending") {
      return;
    }
    connect({ connector: primaryConnector }).catch(() => {
      // kullanıcı tekrar deneyebilir
    });
  };

  const handleSubmitScore = async () => {
    if (!canSubmitScore || !address) {
      return;
    }
    try {
      setSubmitState("pending");
      setSubmitError(null);
      const message = `BaseMerge::score::${finalScore}::${SEASON_ID}`;
      const signature = await signMessageAsync({ message });
      const url = new URL("/api/submit-score", API_BASE);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, score: finalScore, signature }),
      });
      if (!response.ok) {
        const details = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(details?.error ?? "Skor gönderilemedi");
      }
      setSubmitState("success");
      queryClient.invalidateQueries({ queryKey: ["leaderboard"], exact: false });
    } catch (error) {
      setSubmitState("error");
      setSubmitError(error instanceof Error ? error.message : "Bilinmeyen hata");
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__head">
          <div>
            <p className="eyebrow">Base · Farcaster</p>
            <h1>Base Merge</h1>
          </div>
          <span className="mini-tag">Mini App</span>
        </div>
        <p className="hero__copy">
          2048’lik Base token merdivenini tırman, skorunu zincir üzerinde doğrula ve liderlik
          tablosunda yerini al.
        </p>
        <div className="wallet-card">
          {isConnected && address ? (
            <>
              <div className="wallet-label">Bağlı cüzdan</div>
              <div className="wallet-address">{shortAddress(address)}</div>
            </>
          ) : (
            <button
              type="button"
              className="primary"
              onClick={handleConnect}
              disabled={!primaryConnector || connectStatus === "pending"}
            >
              {connectLabel}
            </button>
          )}
        </div>
      </header>

      <section className="score-panel">
        <StatCard label="Skor" value={score} highlight />
        <StatCard label="En iyi" value={bestScore} />
        <StatCard label="Son Hamle" value={lastGain} muted />
        <StatCard label="Hedef" value={TARGET_VALUE} muted />
      </section>

      <ProgressBar progress={progress} highestTile={highestTile} />

      {status === "won" && (
        <Banner tone="success" message="Base jetonunu açtın! +10.000 bonus puan eklendi." />
      )}
      {status === "over" && (
        <Banner tone="danger" message="Hamle kalmadı. Tekrar deneyip daha yüksek skor al!" />
      )}

      <GameBoard grid={grid} onMove={applyMove} />
      <ControlPad onMove={applyMove} onReset={resetGame} />

      <section className="submit-card">
        <div>
          <h2>Skorunu gönder</h2>
          <p>
            {status === "won"
              ? "Zafer bonusu sayesinde fazladan 10.000 puan kazandın."
              : "Skorunu zincir üzerinde imzala ve Base Merge liderliğine gir."}
          </p>
        </div>
        <button
          type="button"
          className="primary"
          disabled={!canSubmitScore || submitState === "pending" || isSigning}
          onClick={handleSubmitScore}
        >
          {submitState === "pending" || isSigning
            ? "İmzalanıyor..."
            : canSubmitScore
              ? `Skoru gönder (${finalScore.toLocaleString("tr-TR")})`
              : "Oyunu bitirince aktif"}
        </button>
        {submitState === "success" && <p className="success-text">Skor kaydedildi! 🔥</p>}
        {submitState === "error" && submitError && <p className="error-text">{submitError}</p>}
      </section>

      <LeaderboardSection
        window={leaderboardWindow}
        onWindowChange={setLeaderboardWindow}
        query={leaderboardQuery}
      />
    </div>
  );
}

type LeaderboardProps = {
  window: LeaderboardWindow;
  onWindowChange: (value: LeaderboardWindow) => void;
  query: ReturnType<typeof useLeaderboard>;
};

function LeaderboardSection({ window, onWindowChange, query }: LeaderboardProps) {
  const { data, isLoading, isError } = query;

  return (
    <section className="leaderboard">
      <div className="leaderboard__head">
        <h2>Liderlik Tablosu</h2>
        <div className="segmented">
          <button
            type="button"
            className={window === "daily" ? "active" : ""}
            onClick={() => onWindowChange("daily")}
          >
            Günlük
          </button>
          <button
            type="button"
            className={window === "season" ? "active" : ""}
            onClick={() => onWindowChange("season")}
          >
            Sezon
          </button>
        </div>
      </div>

      {isLoading && <p className="muted">Tablo yenileniyor...</p>}
      {isError && <p className="error-text">Veri alınamadı. Birazdan tekrar dene.</p>}
      {!isLoading && !isError && data && (
        <ul>
          {data.length === 0 && <li className="muted">Henüz skor yok.</li>}
          {data.map((entry) => (
            <li key={entry.wallet}>
              <span className="rank">#{entry.rank}</span>
              <span className="wallet">{shortAddress(entry.wallet)}</span>
              <span className="score">{entry.score.toLocaleString("tr-TR")}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type GameBoardProps = {
  grid: number[][];
  onMove: (direction: Direction) => void;
};

function GameBoard({ grid, onMove }: GameBoardProps) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const threshold = 24;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    startRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!startRef.current) {
      return;
    }
    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      startRef.current = null;
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      onMove(dx > 0 ? "right" : "left");
    } else {
      onMove(dy > 0 ? "down" : "up");
    }
    startRef.current = null;
  };

  return (
    <section
      className="board"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        startRef.current = null;
      }}
      onPointerCancel={() => {
        startRef.current = null;
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((value, columnIndex) => <Tile key={`${rowIndex}-${columnIndex}`} value={value} />),
      )}
    </section>
  );
}

function Tile({ value }: { value: number }) {
  if (value === 0) {
    return <div className="tile empty" />;
  }

  const tier = getTokenTier(value);
  const style = {
    backgroundColor: tier?.background ?? "rgba(255,255,255,0.08)",
    color: tier?.text ?? "#ffffff",
  };

  return (
    <div className="tile" style={style}>
      <div className="tile__value">{value}</div>
      {tier && <div className="tile__symbol">{tier.symbol}</div>}
    </div>
  );
}

function ControlPad({
  onMove,
  onReset,
}: {
  onMove: (direction: Direction) => void;
  onReset: () => void;
}) {
  return (
    <section className="controls">
      <div className="control-grid">
        {CONTROL_MAP.map((control) => (
          <button key={control.direction} type="button" onClick={() => onMove(control.direction)}>
            {control.label}
          </button>
        ))}
      </div>
      <button type="button" className="ghost" onClick={onReset}>
        Yeni tur
      </button>
    </section>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
  muted = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`stat-card ${highlight ? "highlight" : ""}`}>
      <span className="label">{label}</span>
      <strong className={muted ? "muted" : ""}>{value.toLocaleString("tr-TR")}</strong>
    </div>
  );
}

function ProgressBar({ progress, highestTile }: { progress: number; highestTile: number }) {
  return (
    <div className="progress">
      <div className="progress__head">
        <span>İlerleme</span>
        <span>{highestTile} / {TARGET_VALUE}</span>
      </div>
      <div className="progress__track">
        <div className="progress__bar" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

function Banner({ tone, message }: { tone: "success" | "danger"; message: string }) {
  return <div className={`banner ${tone}`}>{message}</div>;
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function useLeaderboard(window: LeaderboardWindow) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", window],
    queryFn: async () => {
      const url = new URL("/api/leaderboard", API_BASE);
      url.searchParams.set("window", window);
      url.searchParams.set("limit", "8");
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error("Liderlik verisi alınamadı");
      }
      return (await response.json()) as LeaderboardEntry[];
    },
    refetchInterval: 30000,
  });
}

export default App;
