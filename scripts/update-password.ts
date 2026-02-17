import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@jhonjhon.com';
    const newPassword = 'JhonJhon@269';

    console.log(`🔒 Updating admin password for ${email}...`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });
        console.log(`✅ Password successfully updated for user: ${user.email}`);
    } catch (error: any) {
        if (error.code === 'P2025') {
            console.error(`❌ User not found with email: ${email}`);
        } else {
            console.error(`❌ Error updating password:`, error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
