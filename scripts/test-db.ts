
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Hardcoded for test - DIRECT COPY from .env.local
const connectionString = 'postgresql://neondb_owner:npg_YyQjsu7AD9la@ep-icy-block-ahmbcvcr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
    console.log('--- ISOLATED DB TEST ---');
    console.log('Connection String:', connectionString.substring(0, 20) + '...');

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool as any);
    const prisma = new PrismaClient({ adapter });

    try {
        console.log('Connecting...');
        // Try a metadata query first
        // const metrics = await prisma.$metrics.json();
        // console.log('Metrics OK');

        console.log('Querying Services...');
        const count = await prisma.service.count();
        console.log('✅ Success! Service Count:', count);
    } catch (e: any) {
        console.error('❌ Connection Failed:', e);
        if (e.message) console.error('Message:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
