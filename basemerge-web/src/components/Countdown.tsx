"use client";

import { useEffect, useState } from "react";

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

export function Countdown({ targetDate }: { targetDate?: Date | null }) {
  const now = useNow();
  if (!targetDate) {
    return <span className="font-mono text-sm text-blue-100">--:--:--</span>;
  }
  const diff = targetDate.getTime() - now;
  if (diff <= 0) {
    return <span className="font-mono text-sm text-blue-100">00:00:00</span>;
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  const display = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
  return <span className="font-mono text-sm text-blue-100">{display}</span>;
}
