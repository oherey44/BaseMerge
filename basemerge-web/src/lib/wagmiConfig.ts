import { http, createConfig } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { base, baseSepolia } from "wagmi/chains";

const baseRpc = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://mainnet.base.org";
const baseSepoliaRpc =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

const targetChainEnv = process.env.NEXT_PUBLIC_CHAIN?.toLowerCase();
const defaultChain = targetChainEnv === "base" ? base : baseSepolia;

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(baseRpc),
    [baseSepolia.id]: http(baseSepoliaRpc),
  },
  connectors: [
    coinbaseWallet({
      appName: "BaseMerge",
      preference: "all",
      appLogoUrl: "https://basemerge.vercel.app/icon.png",
    }),
    injected({ shimDisconnect: true }),
  ],
  ssr: true,
});

export const primaryChain = defaultChain;
