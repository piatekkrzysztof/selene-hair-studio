import { PrismaClient } from "@prisma/client";

// W dev Next przeładowuje moduły przy każdej zmianie. Bez tego cache'u
// każdy hot reload tworzyłby nowe połączenie i baza szybko wyczerpałaby pulę.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
