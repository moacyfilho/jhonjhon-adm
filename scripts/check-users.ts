import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Listando Usuários do Sistema ---');
    const users = await prisma.user.findMany({
        select: { id: true, email: true, role: true }
    });
    users.forEach(u => console.log(`E-mail: ${u.email}, Cargo: ${u.role}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
