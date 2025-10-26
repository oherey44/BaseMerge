-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShareQuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallet" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'farcaster',
    "lastCompletedAt" DATETIME
);
INSERT INTO "new_ShareQuest" ("id", "lastCompletedAt", "wallet") SELECT "id", "lastCompletedAt", "wallet" FROM "ShareQuest";
DROP TABLE "ShareQuest";
ALTER TABLE "new_ShareQuest" RENAME TO "ShareQuest";
CREATE UNIQUE INDEX "ShareQuest_wallet_key" ON "ShareQuest"("wallet");
CREATE UNIQUE INDEX "ShareQuest_wallet_type_key" ON "ShareQuest"("wallet", "type");
CREATE TABLE "new_ShareTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallet" TEXT NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "awardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'farcaster'
);
INSERT INTO "new_ShareTicket" ("awardedAt", "consumed", "consumedAt", "id", "wallet") SELECT "awardedAt", "consumed", "consumedAt", "id", "wallet" FROM "ShareTicket";
DROP TABLE "ShareTicket";
ALTER TABLE "new_ShareTicket" RENAME TO "ShareTicket";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
