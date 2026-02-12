import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'

// Hardcoded for reliability during deploy
const FALLBACK_DB_URL = 'postgresql://neondb_owner:npg_YyQjsu7AD9la@ep-icy-block-ahmbcvcr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const connectionString = process.env.DATABASE_URL || FALLBACK_DB_URL;

if (!process.env.DATABASE_URL) {
  console.warn('[DB] ⚠️ DATABASE_URL missing from env! Using hardcoded fallback.');
}

// Configure WebSocket for Neon Serverless (try ws module, fallback to native WebSocket)
try {
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
} catch {
  // ws not available (Edge/Serverless runtime) - use native WebSocket if available
  if (typeof WebSocket !== 'undefined') {
    neonConfig.webSocketConstructor = WebSocket as any;
  }
}

const createPrismaClient = () => {
  // Always use Neon Serverless Adapter for consistency
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool as any)
  return new PrismaClient({ adapter } as any)
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
