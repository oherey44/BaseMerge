"use client";

import { useCallback, useEffect, useMemo } from "react";
import { zeroAddress } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

import { dailyTicketAbi } from "@/lib/abi/dailyTicket";
import { primaryChain } from "@/lib/wagmiConfig";

const contractAddressEnv = process.env
  .NEXT_PUBLIC_DAILYTICKET_ADDRESS as `0x${string}` | undefined;

export function useDailyTicket() {
  const { address } = useAccount();

  const enabled = Boolean(address && contractAddressEnv);

  const {
    data: canClaimRaw,
    refetch: refetchCanClaim,
    isLoading: isLoadingCanClaim,
  } = useReadContract({
    abi: dailyTicketAbi,
    address: contractAddressEnv,
    functionName: "canPlay",
    args: [address ?? zeroAddress],
    query: {
      enabled,
      refetchOnWindowFocus: false,
    },
    chainId: primaryChain.id,
  });

  const { data: nextEligibleRaw, refetch: refetchNextEligible } = useReadContract({
    abi: dailyTicketAbi,
    address: contractAddressEnv,
    functionName: "nextEligibleTimestamp",
    args: [address ?? zeroAddress],
    query: {
      enabled,
      refetchOnWindowFocus: false,
    },
    chainId: primaryChain.id,
  });

  const nextEligibleDate = useMemo(() => {
    if (!nextEligibleRaw) {
      return undefined;
    }
    const timestamp = Number(nextEligibleRaw) * 1000;
    if (Number.isNaN(timestamp) || timestamp === 0) {
      return undefined;
    }
    return new Date(timestamp);
  }, [nextEligibleRaw]);

  const { writeContractAsync, status } = useWriteContract();

  const claimTicket = useCallback(async () => {
    if (!contractAddressEnv) {
      throw new Error("NEXT_PUBLIC_DAILYTICKET_ADDRESS env is missing");
    }
    const hash = await writeContractAsync({
      address: contractAddressEnv,
      abi: dailyTicketAbi,
      functionName: "claimDailyTicket",
      chainId: primaryChain.id,
    });
    return hash;
  }, [writeContractAsync]);

  useEffect(() => {
    if (status === "success") {
      refetchCanClaim();
      refetchNextEligible();
    }
  }, [status, refetchCanClaim, refetchNextEligible]);

  return {
    contractConfigured: Boolean(contractAddressEnv),
    canClaim: enabled ? Boolean(canClaimRaw) : undefined,
    isLoadingCanClaim,
    claimTicket,
    isClaiming: status === "pending",
    nextEligibleDate,
    isQueryEnabled: enabled,
  };
}
