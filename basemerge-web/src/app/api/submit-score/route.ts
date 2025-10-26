import { NextResponse } from "next/server";
import { verifyMessage } from "viem";

import { prisma } from "@/lib/prisma";

const SEASON_ID = "season-1";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    address,
    score,
    signature,
  }: { address?: string; score?: number; signature?: `0x${string}` } = body;

  if (!address || typeof score !== "number" || !signature) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (score <= 0) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

  const message = `BaseMerge::score::${score}::${SEASON_ID}`;

  const isValid = await verifyMessage({
    address: address as `0x${string}`,
    message,
    signature,
  }).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const saved = await prisma.score.create({
    data: {
      wallet: address.toLowerCase(),
      score,
      seasonId: SEASON_ID,
    },
  });

  return NextResponse.json({ id: saved.id });
}
