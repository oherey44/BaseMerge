"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWalletClient } from "wagmi";

const SHARE_MESSAGE_PREFIX = "BaseMerge::share::";
const TWEET_MESSAGE_PREFIX = "BaseMerge::tweet::";
const CONSUME_MESSAGE = "BaseMerge::consume_bonus";
const FOLLOW_MESSAGE = "BaseMerge::follow_dev";

async function fetchBonusStatus(address: string) {
  const url = new URL("/api/tickets/bonus", window.location.origin);
  url.searchParams.set("wallet", address);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Unable to load bonus status");
  }
  return res.json() as Promise<{
    bonusTickets: number;
    farcaster: { nextAvailableAt: string | null };
    twitter: { nextAvailableAt: string | null };
    follow: { completed: boolean };
  }>;
}

async function shareRequest(payload: { address: string; signature: `0x${string}`; castUrl: string }) {
  const res = await fetch("/api/tickets/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Unable to verify share");
  }
  return res.json();
}

async function tweetRequest(payload: { address: string; signature: `0x${string}`; tweetUrl: string }) {
  const res = await fetch("/api/tickets/twitter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Unable to verify tweet");
  }
  return res.json();
}

async function consumeBonusRequest(payload: { address: string; signature: `0x${string}` }) {
  const res = await fetch("/api/tickets/bonus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Unable to consume bonus");
  }
  return res.json();
}

async function followRequest(payload: { address: string; signature: `0x${string}` }) {
  const res = await fetch("/api/tickets/follow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Unable to grant follow reward");
  }
  return res.json();
}

export function useShareBonus() {
  const { address } = useAccount();
  const client = useWalletClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["share-bonus", address],
    queryFn: () => fetchBonusStatus(address as string),
    enabled: Boolean(address && typeof window !== "undefined"),
    refetchInterval: 60_000,
  });

  const shareMutation = useMutation({
    mutationFn: async ({ castUrl }: { castUrl: string }) => {
      if (!address || !client.data) {
        throw new Error("Wallet not connected");
      }
      const signature = await client.data.signMessage({
        account: client.data.account,
        message: `${SHARE_MESSAGE_PREFIX}${castUrl}`,
      });
      return shareRequest({ address, signature, castUrl });
    },
    onSuccess: () => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: ["share-bonus", address] });
      }
    },
  });

  const twitterMutation = useMutation({
    mutationFn: async ({ tweetUrl }: { tweetUrl: string }) => {
      if (!address || !client.data) {
        throw new Error("Wallet not connected");
      }
      const signature = await client.data.signMessage({
        account: client.data.account,
        message: `${TWEET_MESSAGE_PREFIX}${tweetUrl}`,
      });
      return tweetRequest({ address, signature, tweetUrl });
    },
    onSuccess: () => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: ["share-bonus", address] });
      }
    },
  });

  const consumeMutation = useMutation({
    mutationFn: async () => {
      if (!address || !client.data) {
        throw new Error("Wallet not connected");
      }
      const signature = await client.data.signMessage({
        account: client.data.account,
        message: CONSUME_MESSAGE,
      });
      return consumeBonusRequest({ address, signature });
    },
    onSuccess: () => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: ["share-bonus", address] });
      }
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!address || !client.data) {
        throw new Error("Wallet not connected");
      }
      const signature = await client.data.signMessage({
        account: client.data.account,
        message: FOLLOW_MESSAGE,
      });
      return followRequest({ address, signature });
    },
    onSuccess: () => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: ["share-bonus", address] });
      }
    },
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    claimShare: shareMutation.mutateAsync,
    claimTwitter: twitterMutation.mutateAsync,
    consumeBonus: consumeMutation.mutateAsync,
    claimFollow: followMutation.mutateAsync,
    isClaimingShare: shareMutation.isPending,
    isClaimingTwitter: twitterMutation.isPending,
    isConsumingBonus: consumeMutation.isPending,
    isClaimingFollow: followMutation.isPending,
    error: query.error,
  };
}
