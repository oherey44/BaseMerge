import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const SEASON_ID = "season-1";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const windowParam = searchParams.get("window") ?? "daily";
  const limit = Number(searchParams.get("limit") ?? 20);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }

  if (windowParam === "season") {
    const scores = await prisma.score.groupBy({
      by: ["wallet"],
      where: {
        seasonId: SEASON_ID,
      },
      _sum: {
        score: true,
      },
      orderBy: {
        _sum: {
          score: "desc",
        },
      },
      take: limit,
    });

    return NextResponse.json(
      scores.map((entry, index) => ({
        wallet: entry.wallet,
        score: entry._sum.score ?? 0,
        rank: index + 1,
      })),
    );
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const daily = await prisma.score.groupBy({
    by: ["wallet"],
    where: {
      createdAt: {
        gte: todayStart,
      },
    },
    _sum: {
      score: true,
    },
    orderBy: {
      _sum: {
        score: "desc",
      },
    },
    take: limit,
  });

  return NextResponse.json(
    daily.map((entry, index) => ({
      wallet: entry.wallet,
      score: entry._sum.score ?? 0,
      rank: index + 1,
    })),
  );
}
