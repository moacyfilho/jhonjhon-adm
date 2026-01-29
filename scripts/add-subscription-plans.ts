import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Criando planos de assinatura...');

    // Plano 1: Jhonjhon club Corte
    const plan1 = await prisma.subscriptionPlan.create({
        data: {
            name: 'Jhonjhon club Corte',
            price: 69.90,
            durationDays: 30,
            description: 'Plano mensal com corte de cabelo',
            isActive: true,
        },
    });
    console.log('✅ Plano criado:', plan1.name);

    // Plano 2: Jhonjhon club Corte & Barba
    const plan2 = await prisma.subscriptionPlan.create({
        data: {
            name: 'Jhonjhon club Corte & Barba',
            price: 129.90,
            durationDays: 30,
            description: 'Plano mensal com corte de cabelo e barba',
            isActive: true,
        },
    });
    console.log('✅ Plano criado:', plan2.name);

    // Plano 3: Jhonjhon club Barba
    const plan3 = await prisma.subscriptionPlan.create({
        data: {
            name: 'Jhonjhon club Barba',
            price: 75.00,
            durationDays: 30,
            description: 'Plano mensal com barba',
            isActive: true,
        },
    });
    console.log('✅ Plano criado:', plan3.name);

    console.log('\n✨ Planos de assinatura criados com sucesso!');
}

main()
    .catch((e) => {
        console.error('❌ Erro:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
