"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Countdown } from "@/components/Countdown";

function truncate(address: string) {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

async function fetchLeaderboard(range: "daily" | "season") {
  const url = new URL("/api/leaderboard", window.location.origin);
  url.searchParams.set("window", range);
  url.searchParams.set("limit", "50");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Unable to load leaderboard");
  }
  return res.json() as Promise<Array<{ wallet: string; score: number; rank: number }>>;
}

export function Leaderboard() {
  const dailyQuery = useQuery({
    queryKey: ["leaderboard", "daily"],
    queryFn: () => fetchLeaderboard("daily"),
    refetchInterval: 60_000,
  });

  const seasonQuery = useQuery({
    queryKey: ["leaderboard", "season"],
    queryFn: () => fetchLeaderboard("season"),
    refetchInterval: 120_000,
  });

  const seasonResetDate = useMemo(() => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const nextMonth = now.getUTCMonth() + 1;
    return new Date(Date.UTC(year, nextMonth, 1, 0, 0, 0, 0));
  }, []);

  const prizeCopy = "Cash prizes: $15 for #1, $10 for #2, $5 for #3 every month.";

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
        <p className="font-semibold uppercase tracking-wide text-emerald-200">Top 3 rewards</p>
        <p>{prizeCopy}</p>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Season reset</p>
          <p className="text-sm text-slate-200">Leaderboard rolls over monthly. Clock is ticking.</p>
        </div>
        <Countdown targetDate={seasonResetDate} />
      </div>
      <Section title="Daily Leaders" query={dailyQuery} emptyMessage="No scores yet" />
      <Section title="Season Leaders" query={seasonQuery} emptyMessage="No scores yet" />
    </div>
  );
}

function Section({
  title,
  query,
  emptyMessage,
}: {
  title: string;
  query: ReturnType<typeof useQuery<Array<{ wallet: string; score: number; rank: number }>>>;
  emptyMessage: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {query.isLoading && <span className="text-xs text-slate-400">Loading…</span>}
      </div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">Top 50 wallets</p>
      <div className="flex flex-col gap-2">
        {query.data?.length ? (
          query.data.map((entry) => (
            <div
              key={`${title}-${entry.wallet}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 text-slate-200">
                <span className="text-xs font-bold text-blue-200">#{entry.rank}</span>
                {truncate(entry.wallet)}
              </span>
              <div className="flex items-center gap-3">
                {entry.rank <= 3 && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                    {entry.rank === 1 ? "$15" : entry.rank === 2 ? "$10" : "$5"}
                  </span>
                )}
                <span className="font-semibold text-white">{entry.score.toLocaleString()}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
