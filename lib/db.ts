import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Hardcoded for reliability during deploy/dev
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_YyQjsu7AD9la@ep-icy-block-ahmbcvcr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const createPrismaClient = () => {
  // In development (Node.js), use standard TCP connection for better stability
  if (process.env.NODE_ENV === 'development') {
    return new PrismaClient({
      datasources: {
        db: {
          url: connectionString
        }
      }
    });
  }

  // In production (Cloudflare/Edge), use the Neon Serverless Adapter (WebSocket)
  if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws
  }

  const pool = new Pool({ connectionString })
  // 'as any' fixes type mismatch with Pool options
  const adapter = new PrismaNeon(pool as any)
  return new PrismaClient({ adapter } as any)
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
