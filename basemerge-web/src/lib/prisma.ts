import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

type PrismaInstance = PrismaClient;

export const prisma: PrismaInstance =
  global.prisma || new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
