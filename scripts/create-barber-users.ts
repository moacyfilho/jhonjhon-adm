import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const users = [
        { email: 'dudurocha15p@gmail.com', name: 'Dudu Rocha' },
        { email: 'silvamaycon7264@gmail.com', name: 'Maycon Silva' },
    ];

    const password = 'Mudar123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Iniciando criação de usuários barbeiros...');

    for (const userData of users) {
        try {
            // Verifica se já existe
            const existingUser = await prisma.user.findUnique({
                where: { email: userData.email }
            });

            if (existingUser) {
                console.log(`Usuário ${userData.email} já existe. Atualizando senha e role...`);
                await prisma.user.update({
                    where: { email: userData.email },
                    data: {
                        password: hashedPassword,
                        role: 'BARBER',
                    }
                });
                console.log(`Senha e Role (BARBER) atualizada para ${userData.email}`);
            } else {
                console.log(`Criando usuário ${userData.email}...`);
                await prisma.user.create({
                    data: {
                        email: userData.email,
                        name: userData.name,
                        password: hashedPassword,
                        role: 'BARBER',
                    }
                });
                console.log(`Usuário criado: ${userData.email} (SECRETARY)`);
            }
        } catch (error) {
            console.error(`Erro ao processar ${userData.email}:`, error);
        }
    }

    console.log('Concluído! Senha padrão: Mudar123!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
