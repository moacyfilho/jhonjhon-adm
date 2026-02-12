
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Listing all users...');
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true }
    });
    console.table(users);
}

main().finally(async () => {
    await prisma.$disconnect();
});
