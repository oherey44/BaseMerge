"use client";

import Image from "next/image";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSwipeable } from "react-swipeable";
import { useAccount, useConnect, useDisconnect, useWalletClient, type Connector } from "wagmi";

import { Countdown } from "@/components/Countdown";
import { Leaderboard } from "@/components/Leaderboard";
import { useBaseMergeGame } from "@/hooks/useBaseMergeGame";
import { useDailyTicket } from "@/hooks/useDailyTicket";
import { useShareBonus } from "@/hooks/useShareBonus";
import { Direction } from "@/lib/game/engine";
import { TARGET_VALUE, TOKEN_LADDER, getTokenTier } from "@/lib/game/tokens";
import { primaryChain } from "@/lib/wagmiConfig";

const CONTROL_MAP: { label: string; direction: Direction }[] = [
  { label: "↑", direction: "up" },
  { label: "↓", direction: "down" },
  { label: "←", direction: "left" },
  { label: "→", direction: "right" },
];

const BASE_BONUS = 10000;
type Tab = "game" | "leaderboard" | "tickets" | "guide";
const DEV_FOLLOW_URL = "https://x.com/ameli_moca";

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, interval);
    return () => clearInterval(id);
  }, [interval]);

  return now;
}

export default function Home() {
  const { grid, score, bestScore, status, lastGain, applyMove, resetGame } = useBaseMergeGame();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const walletClient = useWalletClient();
  const queryClient = useQueryClient();
  const dailyTicket = useDailyTicket();
  const shareBonus = useShareBonus();

  const [sessionTickets, setSessionTickets] = useState(0);
  const [canSubmitCurrentScore, setCanSubmitCurrentScore] = useState(false);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);
  const ticketKeyRef = useRef<string | null>(null);
  const statusRef = useRef(status);
  const hasTicketForRunRef = useRef(false);
  const autoSubmitAttemptedRef = useRef(false);
  const autoConnectAttemptedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<Tab>("game");
  const finalScore = status === "won" ? score + BASE_BONUS : score;
  const ticketsAvailable = sessionTickets;

  const hydrateTickets = useCallback(
    (wallet?: string | null) => {
      if (typeof window === "undefined") return;
      const key = wallet ? `basemerge-tickets-${wallet.toLowerCase()}` : null;
      ticketKeyRef.current = key;
      if (!key) {
        setSessionTickets(0);
        return;
      }
      const stored = window.localStorage.getItem(key);
      setSessionTickets(stored ? Number(stored) : 0);
    },
    [],
  );

  const submitMutation = useMutation({
    mutationFn: async (scoreToSubmit: number) => {
      if (!address || !walletClient.data) {
        throw new Error("Wallet not connected");
      }
      const signature = await walletClient.data.signMessage({
        account: walletClient.data.account,
        message: `BaseMerge::score::${scoreToSubmit}::season-1`,
      });
      const res = await fetch("/api/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, score: scoreToSubmit, signature }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit score");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "daily"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "season"] });
    },
  });

  const {
    mutateAsync: submitScoreAsync,
    reset: resetSubmitMutation,
    isPending: isSubmitPending,
    isSuccess: isSubmitSuccess,
    error: submitError,
  } = submitMutation;

  const submitErrorMessage = submitError instanceof Error ? submitError.message : null;

  const scheduleMicrotask = useCallback((task: () => void) => {
    if (typeof window !== "undefined" && typeof queueMicrotask === "function") {
      queueMicrotask(task);
    } else {
      setTimeout(task, 0);
    }
  }, []);

  const initializeRunState = useCallback(
    (availableTickets: number) => {
      hasTicketForRunRef.current = availableTickets > 0;
      setCanSubmitCurrentScore(false);
      setAutoSubmitTriggered(false);
      autoSubmitAttemptedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (status === "playing") {
      resetSubmitMutation();
      scheduleMicrotask(() => initializeRunState(ticketsAvailable));
    }
  }, [status, ticketsAvailable, resetSubmitMutation, initializeRunState, scheduleMicrotask]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const load = () => hydrateTickets(address);
    if (typeof queueMicrotask === "function") {
      queueMicrotask(load);
    } else {
      setTimeout(load, 0);
    }
  }, [address, hydrateTickets]);

  useEffect(() => {
    if (isConnected || autoConnectAttemptedRef.current) {
      return;
    }
    const injectedConnector = connectors.find((connector) => connector.id === "injected");
    if (injectedConnector && injectedConnector.ready && connectStatus !== "pending") {
      autoConnectAttemptedRef.current = true;
      connect({ connector: injectedConnector }).catch(() => {
        // ignored; user can still connect manually
      });
    }
  }, [isConnected, connectors, connectStatus, connect]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ticketKeyRef.current) return;
    window.localStorage.setItem(ticketKeyRef.current, String(sessionTickets));
  }, [sessionTickets]);

  useEffect(() => {
    if (statusRef.current !== status && (status === "won" || status === "over")) {
      if (hasTicketForRunRef.current) {
        const consume = () => setSessionTickets((prev) => Math.max(prev - 1, 0));
        scheduleMicrotask(consume);
        hasTicketForRunRef.current = false;
        scheduleMicrotask(() => setCanSubmitCurrentScore(true));
      } else {
        scheduleMicrotask(() => setCanSubmitCurrentScore(false));
      }
    }
    statusRef.current = status;
  }, [status, scheduleMicrotask]);

  const isWrongNetwork = Boolean(isConnected && chainId && chainId !== primaryChain.id);
  const gameFinished = status === "won" || status === "over";
  const bonusTickets = shareBonus.status?.bonusTickets ?? 0;
  const farcasterNext = shareBonus.status?.farcaster?.nextAvailableAt
    ? new Date(shareBonus.status.farcaster.nextAvailableAt)
    : null;
  const twitterNext = shareBonus.status?.twitter?.nextAvailableAt
    ? new Date(shareBonus.status.twitter.nextAvailableAt)
    : null;
  const handleSubmitScore = useCallback(() => {
    if (!canSubmitCurrentScore) {
      return Promise.resolve();
    }
    autoSubmitAttemptedRef.current = true;
    return submitScoreAsync(finalScore);
  }, [submitScoreAsync, finalScore, canSubmitCurrentScore]);
  const handleClaimDailyTicket = useCallback(async () => {
    const txHash = await dailyTicket.claimTicket();
    setSessionTickets((prev) => prev + 1);
    return txHash;
  }, [dailyTicket]);
  const canPlay = ticketsAvailable > 0 && !gameFinished;

  const handleMove = useCallback(
    (direction: Direction) => {
      if (!canPlay) {
        return;
      }
      applyMove(direction);
    },
    [canPlay, applyMove],
  );

  const handleResetBoard = useCallback(() => {
    resetGame();
    resetSubmitMutation();
    initializeRunState(ticketsAvailable);
  }, [resetGame, resetSubmitMutation, initializeRunState, ticketsAvailable]);

  const swipeHandlers = useSwipeable({
    onSwiped: (event) => {
      const mapping: Record<string, Direction> = {
        Up: "up",
        Down: "down",
        Left: "left",
        Right: "right",
      };
      const move = mapping[event.dir];
      if (move) {
        handleMove(move);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
    trackTouch: true,
  });

  const statusCopy = useMemo(() => {
    switch (status) {
      case "won":
        return "Legend crest unlocked. Come back tomorrow for a fresh run.";
      case "over":
        return "Board is full. Claim or earn another ticket to retry.";
      default:
        return "Slide matching Base tokens to climb the crest ladder.";
    }
  }, [status]);

  const boardStatusMessage = useMemo(() => {
    if (!canPlay) {
      if (!isConnected) return "Connect a wallet to activate your tickets.";
      if (isWrongNetwork) return "Switch to Base mainnet.";
      if (ticketsAvailable === 0) return "No tickets left. Wait 24h or complete quests for bonus attempts.";
      return statusCopy;
    }
    return statusCopy;
  }, [canPlay, isConnected, isWrongNetwork, ticketsAvailable, statusCopy]);

  useEffect(() => {
    if (
      canSubmitCurrentScore &&
      isConnected &&
      walletClient.data &&
      !isSubmitPending &&
      !isSubmitSuccess &&
      !autoSubmitAttemptedRef.current
    ) {
      const flagAutoSubmit = () => setAutoSubmitTriggered(true);
      if (typeof window !== "undefined" && typeof queueMicrotask === "function") {
        queueMicrotask(flagAutoSubmit);
      } else {
        setTimeout(flagAutoSubmit, 0);
      }
      void handleSubmitScore();
    }
  }, [
    canSubmitCurrentScore,
    isConnected,
    walletClient.data,
    isSubmitPending,
    isSubmitSuccess,
    handleSubmitScore,
  ]);

  const handleConsumeBonus = async () => {
    await shareBonus.consumeBonus();
    setSessionTickets((prev) => prev + 1);
  };

  const handleShareQuest = async (castUrl: string) => {
    await shareBonus.claimShare({ castUrl });
  };


  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/30 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-blue-500/10 sm:p-10">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200/80">
              BaseMerge • Daily Base mission
            </span>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              Merge Base tokens. Claim the crest.
            </h1>
            <p className="text-base text-blue-100/80 sm:text-lg">
              Claim one onchain ticket per day, earn bonus attempts by sharing Farcaster casts or tweets, and chase the Base leaderboard.
            </p>
            <p className="text-sm font-semibold text-amber-200">
              Monthly prize pool: $15 for #1, $10 for #2, $5 for #3.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <ScoreCard label="Score" value={finalScore.toLocaleString()} accent="#38bdf8" />
            <ScoreCard
              label="Active Tickets"
              value={ticketsAvailable.toString()}
              helper={ticketsAvailable > 0 ? "Ready to run" : "Claim required"}
            />
            <ScoreCard
              label="Bonus Tickets"
              value={bonusTickets.toString()}
              helper="Earn via Farcaster or Twitter"
            />
            <ScoreCard
              label="Best Run"
              value={bestScore.toLocaleString()}
              helper={lastGain ? `Last merge +${lastGain}` : "Keep climbing"}
            />
          </div>
          <WalletPanel
            isConnected={isConnected}
            isWrongNetwork={isWrongNetwork}
            connectors={connectors}
            connect={connect}
            connectStatus={connectStatus}
            disconnect={disconnect}
          />
          <TabNavigation activeTab={activeTab} onChange={setActiveTab} />
        </header>

        <section>
          {activeTab === "game" && (
            <GameSection
              boardStatusMessage={boardStatusMessage}
              grid={grid}
              handleMove={handleMove}
              canPlay={canPlay}
              resetBoard={handleResetBoard}
              swipeHandlers={swipeHandlers}
              submissionBanner={
                canSubmitCurrentScore ? (
                  <SubmitScorePanel
                    score={finalScore}
                    bonusApplied={status === "won"}
                    isConnected={isConnected}
                    onSubmit={handleSubmitScore}
                    isSubmitting={isSubmitPending}
                    submitSucceeded={isSubmitSuccess}
                    autoSubmitTriggered={autoSubmitTriggered}
                    submitError={submitErrorMessage}
                  />
                ) : null
              }
            />
          )}
          {activeTab === "leaderboard" && <Leaderboard />}
          {activeTab === "tickets" && (
            <div className="flex flex-col gap-6">
              <TicketPanel
                ticketBalance={ticketsAvailable}
                canClaim={dailyTicket.canClaim}
                claimTicket={handleClaimDailyTicket}
                isClaiming={dailyTicket.isClaiming}
                nextEligibleDate={dailyTicket.nextEligibleDate}
                isConnected={isConnected}
                isWrongNetwork={isWrongNetwork}
                bonusTickets={bonusTickets}
              />
              <ShareQuestPanel
                isConnected={isConnected}
                bonusTickets={bonusTickets}
                farcasterNext={farcasterNext}
                twitterNext={twitterNext}
                onShare={handleShareQuest}
                onTweet={(url) => shareBonus.claimTwitter({ tweetUrl: url })}
                isSharing={shareBonus.isClaimingShare}
                isTweeting={shareBonus.isClaimingTwitter}
                ticketBalance={ticketsAvailable}
                onConsume={handleConsumeBonus}
                isConsuming={shareBonus.isConsumingBonus}
                onFollowClaim={() => shareBonus.claimFollow()}
                isFollowClaiming={shareBonus.isClaimingFollow}
                followCompleted={Boolean(shareBonus.status?.follow?.completed)}
                followUrl={DEV_FOLLOW_URL}
              />
            </div>
          )}
          {activeTab === "guide" && <GuideSection />}
        </section>
      </main>
    </div>
  );
}

function TileCell({ value }: { value: number }) {
  if (value === 0) {
    return (
      <div className="flex h-20 items-center justify-center rounded-2xl bg-white/5 text-xs text-slate-500 sm:h-28 sm:text-sm">
        —
      </div>
    );
  }

  const tier = getTokenTier(value);
  const background = tier?.background ?? "#0F172A";
  const textColor = tier?.text ?? "#F8FAFC";

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl px-3 py-3 shadow-inner shadow-black/25 transition-all sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2"
      style={{ backgroundColor: background, color: textColor }}
    >
      {tier && (
        <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white/20 p-1 sm:h-16 sm:w-16">
          <Image src={tier.asset} alt={tier.name} fill sizes="64px" className="object-contain" />
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-base font-black leading-tight sm:text-xl">{tier?.symbol ?? value}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80 sm:text-xs">
          {tier ? `Level ${tier.level}` : "Fusion"}
        </span>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  accent,
  helper,
}: {
  label: string;
  value: string;
  accent?: string;
  helper?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <span className="text-sm uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-2xl font-black" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
      {helper && <span className="text-[11px] text-slate-500">{helper}</span>}
    </div>
  );
}

type ConnectStatus = ReturnType<typeof useConnect>["status"];
type ConnectFn = ReturnType<typeof useConnect>["connect"];
type DisconnectFn = ReturnType<typeof useDisconnect>["disconnect"];

type WalletButtonsProps = {
  isConnected: boolean;
  connectors: Connector[];
  status: ConnectStatus;
  connect: ConnectFn;
  disconnect: DisconnectFn;
};

function WalletButtons({ isConnected, connectors, status, connect, disconnect }: WalletButtonsProps) {
  if (isConnected) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
      >
        Disconnect
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          type="button"
          disabled={status === "pending"}
          onClick={() => connect({ connector })}
          className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          title={connector.ready ? undefined : "Install this wallet extension"}
        >
          {status === "pending" ? "Connecting…" : connector.name}
        </button>
      ))}
    </div>
  );
}

type WalletPanelProps = {
  isConnected: boolean;
  isWrongNetwork: boolean;
  connectors: Connector[];
  connect: ConnectFn;
  connectStatus: ConnectStatus;
  disconnect: DisconnectFn;
};

function WalletPanel({
  isConnected,
  isWrongNetwork,
  connectors,
  connect,
  connectStatus,
  disconnect,
}: WalletPanelProps) {
  const subtitle = !isConnected
    ? "Connect a wallet to save your scores on-chain."
    : isWrongNetwork
      ? "Switch to Base mainnet."
      : "Wallet linked. Tickets are tied to this address.";
  const title = !isConnected ? "Wallet required" : isWrongNetwork ? "Wrong network" : "Wallet connected";

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">{title}</p>
        <p className="text-sm text-blue-50/70">{subtitle}</p>
      </div>
      <WalletButtons
        isConnected={isConnected}
        connectors={connectors}
        status={connectStatus}
        connect={connect}
        disconnect={disconnect}
      />
    </div>
  );
}

function TicketPanel({
  ticketBalance,
  canClaim,
  claimTicket,
  isClaiming,
  nextEligibleDate,
  isConnected,
  isWrongNetwork,
  bonusTickets,
}: {
  ticketBalance: number;
  canClaim?: boolean;
  claimTicket: () => Promise<string | undefined>;
  isClaiming: boolean;
  nextEligibleDate?: Date;
  isConnected: boolean;
  isWrongNetwork: boolean;
  bonusTickets: number;
}) {
  const statusCopy =
    ticketBalance > 0
      ? "You're cleared for a fresh merge."
      : "No tickets available. Claim the daily ticket or convert a bonus run.";

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">Ticket balance</p>
        <p className="text-3xl font-black text-white">{ticketBalance}</p>
        <p className="text-xs text-slate-400">{statusCopy}</p>
        <p className="text-xs text-slate-400">Bonus stash: {bonusTickets}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Daily reset</span>
          <Countdown targetDate={nextEligibleDate ?? null} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => void claimTicket()}
        disabled={!isConnected || isWrongNetwork || !canClaim || isClaiming}
        className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isClaiming ? "Confirming…" : canClaim ? "Claim daily ticket" : "Waiting…"}
      </button>
    </div>
  );
}

function ShareQuestPanel({
  isConnected,
  ticketBalance,
  bonusTickets,
  farcasterNext,
  twitterNext,
  onShare,
  onTweet,
  isSharing,
  isTweeting,
  onConsume,
  isConsuming,
  onFollowClaim,
  isFollowClaiming,
  followCompleted,
  followUrl,
}: {
  isConnected: boolean;
  ticketBalance: number;
  bonusTickets: number;
  farcasterNext: Date | null;
  twitterNext: Date | null;
  onShare: (castUrl: string) => Promise<unknown>;
  onTweet: (tweetUrl: string) => Promise<unknown>;
  isSharing: boolean;
  isTweeting: boolean;
  onConsume: () => Promise<void>;
  isConsuming: boolean;
  onFollowClaim: () => Promise<unknown>;
  isFollowClaiming: boolean;
  followCompleted: boolean;
  followUrl: string;
}) {
  const [castUrl, setCastUrl] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const now = useNow();
  const farcasterReady = !farcasterNext || farcasterNext.getTime() <= now;
  const twitterReady = !twitterNext || twitterNext.getTime() <= now;

  const handleShare = async () => {
    if (!castUrl) return;
    await onShare(castUrl);
    setCastUrl("");
  };

  const handleTweet = async () => {
    if (!tweetUrl) return;
    await onTweet(tweetUrl);
    setTweetUrl("");
  };

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">Quest: Share on Farcaster</p>
          <p className="text-sm text-blue-50/80">
            Post a cast about BaseMerge to earn one bonus ticket every 24h.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Next reset</span>
            <Countdown targetDate={farcasterNext ?? null} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            type="url"
            value={castUrl}
            onChange={(event) => setCastUrl(event.target.value)}
            placeholder="Cast URL"
            className="rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={!isConnected || !farcasterReady || !castUrl || isSharing}
            className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSharing ? "Verifying…" : "Verify cast"}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">Quest: Share on Twitter</p>
          <p className="text-sm text-blue-50/80">
            Tweet about BaseMerge for an additional bonus ticket per day.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Next reset</span>
            <Countdown targetDate={twitterNext ?? null} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            type="url"
            value={tweetUrl}
            onChange={(event) => setTweetUrl(event.target.value)}
            placeholder="Tweet URL"
            className="rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => void handleTweet()}
            disabled={!isConnected || !twitterReady || !tweetUrl || isTweeting}
            className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isTweeting ? "Verifying…" : "Verify tweet"}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">Quest: Follow the dev</p>
          <p className="text-sm text-blue-50/80">
            Visit @ameli_moca on X, then claim a one-time bonus ticket for supporting the builder.
          </p>
          <a
            href={followUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-200 underline"
          >
            Go to profile ↗
          </a>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => void onFollowClaim()}
            disabled={!isConnected || followCompleted || isFollowClaiming}
            className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {followCompleted ? "Completed" : isFollowClaiming ? "Claiming…" : "Claim bonus ticket"}
          </button>
          <p className="text-[11px] text-slate-400">
            One-time reward. You can still use other quests daily for more attempts.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
        <span>
          Active tickets: {ticketBalance} • Bonus stash: {bonusTickets}
        </span>
        <button
          type="button"
          onClick={() => void onConsume()}
          disabled={!isConnected || bonusTickets === 0 || isConsuming}
          className="rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-200/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isConsuming ? "Unlocking…" : "Use bonus ticket"}
        </button>
      </div>
    </div>
  );
}

function TabNavigation({ activeTab, onChange }: { activeTab: Tab; onChange: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "game", label: "Game" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "tickets", label: "Tickets & Quests" },
    { id: "guide", label: "How to Play" },
  ];

  return (
    <div className="flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/5 p-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
            activeTab === tab.id
              ? "bg-white text-slate-900"
              : "text-white/70 hover:bg-white/10"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function GameSection({
  boardStatusMessage,
  grid,
  handleMove,
  canPlay,
  resetBoard,
  swipeHandlers,
  submissionBanner,
}: {
  boardStatusMessage: string;
  grid: number[][];
  handleMove: (direction: Direction) => void;
  canPlay: boolean;
  resetBoard: () => void;
  swipeHandlers: ReturnType<typeof useSwipeable>;
  submissionBanner?: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:gap-8 lg:grid-cols-[2fr,1fr]">
      <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-blue-100/80">{boardStatusMessage}</p>
          <button
            type="button"
            onClick={resetBoard}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Reset board
          </button>
        </div>
        <div
          className={`grid grid-cols-4 gap-2 rounded-3xl bg-slate-900/80 p-3 sm:gap-3 sm:p-6 ${
            !canPlay ? "pointer-events-none opacity-60" : ""
          }`}
          {...swipeHandlers}
        >
          {grid.map((row, rowIndex) =>
            row.map((value, cellIndex) => <TileCell key={`${rowIndex}-${cellIndex}`} value={value} />),
          )}
        </div>
        {!canPlay && (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center text-sm font-semibold uppercase tracking-wide">
            No tickets left. Claim the daily one or finish quests for a bonus attempt.
          </div>
        )}
        {submissionBanner}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {CONTROL_MAP.map((control) => (
              <button
                key={control.direction}
                type="button"
                onClick={() => handleMove(control.direction)}
                disabled={!canPlay}
                className="h-12 w-12 rounded-2xl border border-white/10 bg-white/10 text-xl font-black text-white transition hover:bg-white/20 disabled:opacity-40"
              >
                {control.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">Keyboard shortcuts: WASD or arrow keys.</p>
        </div>
        <p className="text-xs text-slate-500 lg:hidden">
          Token ladder details are available on desktop or in the How to Play tab.
        </p>
      </div>

      <div className="hidden flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-950/90 p-6 lg:flex">
        <div>
          <h2 className="text-lg font-semibold text-white">Token ladder</h2>
          <p className="text-sm text-slate-400">
            Merge identical tiles to climb Base’s market-cap meme ladder.
          </p>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto pr-2">
          {TOKEN_LADDER.map((tier) => (
            <div
              key={tier.value}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white/10 p-1">
                  <Image src={tier.asset} alt={tier.name} fill sizes="48px" className="object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold">{tier.symbol}</span>
                  <span className="text-xs uppercase tracking-wide text-slate-400">{tier.tagline}</span>
                </div>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
                Level {tier.level}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
          <p className="font-semibold">Crest rule</p>
          <p>
            Reach tile value {TARGET_VALUE} to mint the Base crest and trigger the massive score bonus. The board resets and you must wait for the next ticket.
          </p>
        </div>
      </div>
    </div>
  );
}

function GuideSection() {
  const steps = [
    {
      title: "Connect & auto-detect",
      description: "Injected wallets (MetaMask, Rabby, Coinbase) are detected automatically; manual picks stay available.",
      emoji: "🔗",
    },
    {
      title: "Claim your ticket",
      description: "Mint one Base onchain ticket every 24h or spend a bonus ticket earned from quests.",
      emoji: "🎟️",
    },
    {
      title: "Merge Base tokens",
      description: "Swipe or tap to combine matching memecoins, climb the ladder, and chase the Base crest bonus.",
      emoji: "🧩",
    },
    {
      title: "Auto-submit & climb",
      description: "Ticketed runs sign a message in your wallet when they end, posting scores to the daily + season boards.",
      emoji: "🏁",
    },
    {
      title: "Win cash rewards",
      description: "Top 3 wallets every month earn $15, $10, and $5 before the board resets.",
      emoji: "💰",
    },
    {
      title: "Share for boosts",
      description: "Submit one Farcaster cast and one tweet per day to unlock extra attempts and keep streaks alive.",
      emoji: "📣",
    },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">How to play</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {steps.map((step) => (
            <div
              key={step.title}
              className="flex gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-200"
            >
              <span className="text-xl">{step.emoji}</span>
              <div>
                <p className="font-semibold text-white">{step.title}</p>
                <p className="text-xs text-slate-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-200">Token cheat sheet</h3>
        <ul className="space-y-2 text-xs text-slate-300">
          {TOKEN_LADDER.map((tier) => (
            <li key={tier.slug} className="flex items-center justify-between gap-2">
              <span className="font-semibold text-white">{tier.symbol}</span>
              <span className="text-right text-slate-400">{tier.tagline}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SubmitScorePanel({
  score,
  bonusApplied,
  isConnected,
  onSubmit,
  isSubmitting,
  submitSucceeded,
  autoSubmitTriggered,
  submitError,
}: {
  score: number;
  bonusApplied: boolean;
  isConnected: boolean;
  onSubmit: () => Promise<unknown>;
  isSubmitting: boolean;
  submitSucceeded: boolean;
  autoSubmitTriggered: boolean;
  submitError?: string | null;
}) {
  const helperCopy = submitSucceeded
    ? "Score stored on-chain. See you on the leaderboard."
    : submitError
      ? submitError
      : isSubmitting
        ? "Waiting for your wallet signature…"
        : autoSubmitTriggered
          ? "Signature request sent. Approve it in your wallet."
          : "Sign this ticketed run to post it on the leaderboard.";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">Submit score</p>
          <p className="text-sm text-blue-50/80">
            Current run: <span className="font-semibold text-white">{score.toLocaleString()} pts</span>
            {bonusApplied && " (Base crest bonus applied)"}
          </p>
          <p className="text-xs text-slate-400">{helperCopy}</p>
        </div>
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={!isConnected || isSubmitting || submitSucceeded}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitSucceeded ? "Submitted" : isSubmitting ? "Signing…" : "Sign & submit"}
        </button>
      </div>
      {!isConnected && (
        <p className="mt-2 text-xs text-rose-300">
          Connect your wallet to record this run on the leaderboard.
        </p>
      )}
    </div>
  );
}
