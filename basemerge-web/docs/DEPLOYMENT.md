# BaseMerge Deployment Guide

Step-by-step checklist for promoting the Farcaster/Base mini-app to production (GitHub + Vercel).

## 1. Smart Contract (DailyTicket)
1. Open [Remix](https://remix.ethereum.org/) and import `contracts/contracts/DailyTicket.sol`.
2. Connect a wallet on Base mainnet and deploy the contract.
3. Copy the deployed address and verify it on [BaseScan](https://basescan.org) (`Verify & Publish` → paste the flattened source).
4. Update the env files:
   - `.env.local` / `.env` → `NEXT_PUBLIC_DAILYTICKET_ADDRESS=<deployed address>`
   - Vercel Project Settings → Environment Variables → same key/value for `Production` + `Preview`.
5. If the contract ABI ever changes, mirror it in `src/lib/abi/dailyTicket.ts`.

## 2. Farcaster (Neynar)
1. Create a Neynar app at [https://neynar.com/dashboard](https://neynar.com/dashboard).
2. Copy the `Client ID` + API key.
3. Set the env vars locally + on Vercel:
   - `NEXT_PUBLIC_NEYNAR_CLIENT_ID=<client id>`
   - `NEYNAR_API_KEY=<server key>`

## 3. Wallet / OnchainKit
1. Request a `NEXT_PUBLIC_ONCHAINKIT_API_KEY` from Coinbase OnchainKit (dashboard).
2. Add it locally + on Vercel.

## 4. Database (Prisma)
1. Provision a hosted Postgres or MySQL instance (Supabase, Neon, PlanetScale, etc.).
2. Replace the local SQLite URL with the managed DB URL:
   - Locally: `.env` + `.env.local` → `DATABASE_URL="postgresql://..."`.
   - Vercel: Project Settings → Environment Variables → `DATABASE_URL`.
3. Run the migrations on the remote database:
   ```bash
   pnpm --filter basemerge-web prisma:migrate
   pnpm --filter basemerge-web prisma:generate
   ```
4. If you need to seed dummy entries, use `sqlite3` or Prisma Studio before taking screenshots, but the production DB should start empty.

## 5. GitHub + Vercel
1. Commit all changes and push to a public or private repo.
2. Import the repo in Vercel → select the `basemerge-web` directory.
3. In Vercel → Settings → Environment Variables, add every key from `.env.local` (Base RPC URLs, contract address, Neynar keys, OnchainKit key, `NEXT_PUBLIC_CHAIN`, `DATABASE_URL`).
4. Trigger a deployment. First build takes ~1–2 minutes because Prisma client is generated on the server.
5. Smoke-test the Preview URL:
   - Connect wallet (injected & Coinbase).
   - Claim daily ticket (ensure Base mainnet RPC is reachable).
   - Finish a run and confirm the auto-submit signature pops up.
   - Check `/api/leaderboard?window=daily` returns JSON (no 500).

## 6. Final Launch Checklist
- [ ] Contract verified on BaseScan and address stored in envs.
- [ ] Neynar + OnchainKit keys live in Vercel + local.
- [ ] `DATABASE_URL` points to a hosted DB (no SQLite in production).
- [ ] `pnpm --filter basemerge-web dev` works locally without warnings.
- [ ] Leaderboard shows scores after a ticketed run.
- [ ] Farcaster/Twitter quests increment bonus tickets and can be consumed.
- [ ] README + docs updated with any team-specific instructions.

Once everything above is green, switch Vercel to use the latest deployment as Production.***
