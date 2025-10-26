import { NextResponse } from "next/server";
import { verifyMessage } from "viem";

import { prisma } from "@/lib/prisma";

const FOLLOW_MESSAGE = "BaseMerge::follow_dev";

export async function POST(request: Request) {
  const body = await request.json();
  const { address, signature }: { address?: string; signature?: `0x${string}` } = body;

  if (!address || !signature) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const isValid = await verifyMessage({
    address: address as `0x${string}`,
    message: FOLLOW_MESSAGE,
    signature,
  }).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const existing = await prisma.shareQuest.findUnique({
    where: {
      wallet_type: {
        wallet: address.toLowerCase(),
        type: "follow",
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Follow quest already completed" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.shareTicket.create({
      data: {
        wallet: address.toLowerCase(),
        source: "follow",
      },
    }),
    prisma.shareQuest.create({
      data: {
        wallet: address.toLowerCase(),
        type: "follow",
        lastCompletedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
