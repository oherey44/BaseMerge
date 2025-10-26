import { NextResponse } from "next/server";
import { verifyMessage } from "viem";

import { prisma } from "@/lib/prisma";

const CONSUME_MESSAGE = "BaseMerge::consume_bonus";
const SHARE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
  }

  const [bonusTickets, quests] = await Promise.all([
    prisma.shareTicket.count({
      where: { wallet: wallet.toLowerCase(), consumed: false },
    }),
    prisma.shareQuest.findMany({ where: { wallet: wallet.toLowerCase() } }),
  ]);

  const getNext = (type: string) => {
    const quest = quests.find((item) => item.type === type);
    if (!quest?.lastCompletedAt) return null;
    return new Date(quest.lastCompletedAt.getTime() + SHARE_WINDOW_MS);
  };
  const followCompleted = quests.some((quest) => quest.type === "follow");

  return NextResponse.json({
    bonusTickets,
    farcaster: { nextAvailableAt: getNext("farcaster") },
    twitter: { nextAvailableAt: getNext("twitter") },
    follow: { completed: followCompleted },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { address, signature }: { address?: string; signature?: `0x${string}` } = body;

  if (!address || !signature) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const isValid = await verifyMessage({
    address: address as `0x${string}`,
    message: CONSUME_MESSAGE,
    signature,
  }).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const ticket = await prisma.shareTicket.findFirst({
    where: { wallet: address.toLowerCase(), consumed: false },
    orderBy: { awardedAt: "asc" },
  });

  if (!ticket) {
    return NextResponse.json({ error: "No bonus tickets" }, { status: 404 });
  }

  await prisma.shareTicket.update({
    where: { id: ticket.id },
    data: { consumed: true, consumedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
