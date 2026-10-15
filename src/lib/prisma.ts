import { PrismaClient } from "@prisma/client";

// Global BigInt serialization patch for JSON.stringify & Next.js API responses
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  interface BigInt {
    toJSON(): number | string;
  }
}

if (!BigInt.prototype.hasOwnProperty("toJSON")) {
  Object.defineProperty(BigInt.prototype, "toJSON", {
    value: function () {
      const num = Number(this);
      return Number.isSafeInteger(num) ? num : this.toString();
    },
    writable: true,
    configurable: true,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
