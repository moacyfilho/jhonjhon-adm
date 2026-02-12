import { PrismaClient } from '@prisma/client'

// Direct connection using standard PrismaClient (no WebSocket adapter needed)
const NEON_DB_URL = 'postgresql://neondb_owner:npg_YyQjsu7AD9la@ep-icy-block-ahmbcvcr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const createPrismaClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || NEON_DB_URL
      }
    }
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
