import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@jhonjhon.com';
    const pass = 'admin123';

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.log('Usuário não encontrado');
        return;
    }

    const isValid = await bcrypt.compare(pass, user.password);
    console.log(`Verificando admin@jhonjhon.com / admin123: ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
