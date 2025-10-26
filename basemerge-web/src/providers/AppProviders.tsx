"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { WalletProvider } from "@coinbase/onchainkit/wallet";
import { WagmiProvider } from "wagmi";

import { primaryChain, wagmiConfig } from "@/lib/wagmiConfig";

const queryClient = new QueryClient();

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ?? "";

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider apiKey={apiKey} chain={primaryChain}>
          <WalletProvider>{children}</WalletProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
