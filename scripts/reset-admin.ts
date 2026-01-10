
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@jhonjhon.com';
    const newPassword = 'admin123';

    console.log(`Checking user: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.log('User not found. Creating it...');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.create({
            data: {
                email,
                name: 'Administrador',
                password: hashedPassword,
                role: 'ADMIN',
            }
        });
        console.log(`User created with password: ${newPassword}`);
    } else {
        console.log('User found. Resetting password to allow login...');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });
        console.log(`Password updated to: ${newPassword}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
