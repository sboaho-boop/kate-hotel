import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!url.startsWith("file:")) return url;

  const rawPath = url.slice("file:".length);
  const bundled = path.isAbsolute(rawPath)
    ? rawPath
    : path.join(process.cwd(), "prisma", rawPath.replace(/^\.\//, ""));

  if (process.env.VERCEL) {
    const dir = path.join(os.tmpdir(), "hms-db");
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, path.basename(bundled));
    if (!fs.existsSync(dest) && fs.existsSync(bundled)) {
      fs.copyFileSync(bundled, dest);
    }
    if (fs.existsSync(dest)) return `file:${dest}`;
  }

  return url;
}

const dbUrl = resolveDatabaseUrl();

function createClient(): PrismaClient {
  const defaultUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  if (dbUrl === defaultUrl) return new PrismaClient();
  return new PrismaClient({ datasources: { db: { url: dbUrl } } });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
