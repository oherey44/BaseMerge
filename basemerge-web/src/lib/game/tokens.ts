export type TokenTier = {
  value: number;
  level: number;
  slug: string;
  asset: string;
  symbol: string;
  name: string;
  tagline: string;
  background: string;
  text: string;
};

export const TARGET_VALUE = 2048;

export const TOKEN_LADDER: TokenTier[] = [
  {
    value: 2,
    level: 1,
    slug: "noice",
    asset: "/tokens/noice.png",
    symbol: "$NOICE",
    name: "Noice",
    tagline: "Base-native degen greeting.",
    background: "#E4EDFF",
    text: "#1B2C5B",
  },
  {
    value: 4,
    level: 2,
    slug: "aixbt",
    asset: "/tokens/aixbt.png",
    symbol: "$AIXBT",
    name: "aixbt",
    tagline: "AI-fueled trading helper.",
    background: "#E5FBFF",
    text: "#064861",
  },
  {
    value: 8,
    level: 3,
    slug: "degen",
    asset: "/tokens/degen.jpg",
    symbol: "$DEGEN",
    name: "Degen",
    tagline: "The Farcaster energy drink.",
    background: "#FDE4FA",
    text: "#5B1645",
  },
  {
    value: 16,
    level: 4,
    slug: "clanker",
    asset: "/tokens/clanker.png",
    symbol: "$CLANKER",
    name: "Clanker",
    tagline: "Infamous Base memebot.",
    background: "#FFE9E2",
    text: "#7A2D1E",
  },
  {
    value: 32,
    level: 5,
    slug: "brett",
    asset: "/tokens/brett.png",
    symbol: "$BRETT",
    name: "Brett",
    tagline: "Base’s poster child.",
    background: "#FFEEDB",
    text: "#7B341E",
  },
  {
    value: 64,
    level: 6,
    slug: "toshi",
    asset: "/tokens/toshi.jpg",
    symbol: "$TOSHI",
    name: "Toshi",
    tagline: "Frogtown captain.",
    background: "#D8F4FF",
    text: "#0A4D68",
  },
  {
    value: 128,
    level: 7,
    slug: "zora",
    asset: "/tokens/zora.png",
    symbol: "$ZORA",
    name: "Zora",
    tagline: "Open edition powerhouse.",
    background: "#F1E8FF",
    text: "#40207C",
  },
  {
    value: 256,
    level: 8,
    slug: "avantis",
    asset: "/tokens/avantis.png",
    symbol: "$AVNT",
    name: "Avantis",
    tagline: "Perps hub of Base.",
    background: "#E7F5FF",
    text: "#103465",
  },
  {
    value: 512,
    level: 9,
    slug: "virtuals",
    asset: "/tokens/virtuals.png",
    symbol: "$VIRTUAL",
    name: "Virtuals Protocol",
    tagline: "NPC factory for Base.",
    background: "#EAFEF1",
    text: "#164A2F",
  },
  {
    value: 1024,
    level: 10,
    slug: "aerodrome",
    asset: "/tokens/aerodrome.png",
    symbol: "$AERO",
    name: "Aerodrome Finance",
    tagline: "Base’s liquidity engine.",
    background: "#E2FFF4",
    text: "#065F46",
  },
  {
    value: TARGET_VALUE,
    level: 11,
    slug: "base",
    asset: "/tokens/base.png",
    symbol: "BASE",
    name: "Base Token",
    tagline: "Final form of the ladder.",
    background: "#0028FF",
    text: "#FFFFFF",
  },
];

export function getTokenTier(value: number): TokenTier | undefined {
  return TOKEN_LADDER.find((tier) => tier.value === value);
}
