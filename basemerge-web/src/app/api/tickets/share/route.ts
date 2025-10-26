import { NextResponse } from "next/server";
import { verifyMessage } from "viem";

import { prisma } from "@/lib/prisma";

const SHARE_MESSAGE_PREFIX = "BaseMerge::share::";
const SHARE_WINDOW_MS = 24 * 60 * 60 * 1000;

async function verifyCastViaNeynar(castUrl: string) {
  try {
    const parsed = new URL(castUrl);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("warpcast") && !host.includes("farcaster")) {
      throw new Error("Cast URL must be a Farcaster link");
    }
  } catch {
    throw new Error("Invalid cast URL");
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    address,
    signature,
    castUrl,
  }: { address?: string; signature?: `0x${string}`; castUrl?: string } = body;

  if (!address || !signature || !castUrl) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const message = `${SHARE_MESSAGE_PREFIX}${castUrl}`;

  const isValid = await verifyMessage({
    address: address as `0x${string}`,
    message,
    signature,
  }).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    await verifyCastViaNeynar(castUrl);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const existing = await prisma.shareQuest.findUnique({
    where: { wallet_type: { wallet: address.toLowerCase(), type: "farcaster" } },
  });
  const now = Date.now();
  if (existing?.lastCompletedAt && now - existing.lastCompletedAt.getTime() < SHARE_WINDOW_MS) {
    const nextAvailableAt = new Date(existing.lastCompletedAt.getTime() + SHARE_WINDOW_MS);
    return NextResponse.json(
      { error: "Share quest already completed", nextAvailableAt },
      { status: 429 },
    );
  }

  await prisma.$transaction([
    prisma.shareTicket.create({
      data: {
        wallet: address.toLowerCase(),
        source: "farcaster",
      },
    }),
    prisma.shareQuest.upsert({
      where: { wallet_type: { wallet: address.toLowerCase(), type: "farcaster" } },
      update: { lastCompletedAt: new Date(now) },
      create: { wallet: address.toLowerCase(), type: "farcaster", lastCompletedAt: new Date(now) },
    }),
  ]);

  const nextAvailableAt = new Date(now + SHARE_WINDOW_MS);

  return NextResponse.json({ success: true, nextAvailableAt });
}
