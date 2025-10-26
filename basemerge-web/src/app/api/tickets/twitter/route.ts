import { NextResponse } from "next/server";
import { verifyMessage } from "viem";

import { prisma } from "@/lib/prisma";

const TWEET_MESSAGE_PREFIX = "BaseMerge::tweet::";
const SHARE_WINDOW_MS = 24 * 60 * 60 * 1000;

function isValidTweetUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith("twitter.com") || parsed.hostname.endsWith("x.com");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    address,
    signature,
    tweetUrl,
  }: { address?: string; signature?: `0x${string}`; tweetUrl?: string } = body;

  if (!address || !signature || !tweetUrl) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!isValidTweetUrl(tweetUrl)) {
    return NextResponse.json({ error: "Invalid tweet URL" }, { status: 400 });
  }

  const message = `${TWEET_MESSAGE_PREFIX}${tweetUrl}`;

  const isValid = await verifyMessage({
    address: address as `0x${string}`,
    message,
    signature,
  }).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const quest = await prisma.shareQuest.findUnique({
    where: { wallet_type: { wallet: address.toLowerCase(), type: "twitter" } },
  });
  const now = Date.now();
  if (quest?.lastCompletedAt && now - quest.lastCompletedAt.getTime() < SHARE_WINDOW_MS) {
    const nextAvailableAt = new Date(quest.lastCompletedAt.getTime() + SHARE_WINDOW_MS);
    return NextResponse.json(
      { error: "Twitter quest already completed", nextAvailableAt },
      { status: 429 },
    );
  }

  await prisma.$transaction([
    prisma.shareTicket.create({
      data: {
        wallet: address.toLowerCase(),
        source: "twitter",
      },
    }),
    prisma.shareQuest.upsert({
      where: { wallet_type: { wallet: address.toLowerCase(), type: "twitter" } },
      update: { lastCompletedAt: new Date(now) },
      create: { wallet: address.toLowerCase(), type: "twitter", lastCompletedAt: new Date(now) },
    }),
  ]);

  const nextAvailableAt = new Date(now + SHARE_WINDOW_MS);

  return NextResponse.json({ success: true, nextAvailableAt });
}
