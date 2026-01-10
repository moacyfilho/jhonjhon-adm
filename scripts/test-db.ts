
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('Database Connected Successfully!');
        const count = await prisma.user.count();
        console.log(`User count: ${count}`);
    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
