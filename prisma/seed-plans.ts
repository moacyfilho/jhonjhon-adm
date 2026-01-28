import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding subscription plans...');

    // Plano 1: Jhonjhon club Corte
    const plan1 = await prisma.subscriptionPlan.upsert({
        where: { id: 'plan-corte' },
        update: {},
        create: {
            id: 'plan-corte',
            name: 'Jhonjhon club Corte',
            description: 'Plano mensal com corte de cabelo incluído',
            price: 69.90,
            durationDays: 30,
            servicesIncluded: 'Corte de cabelo',
            usageLimit: null, // Ilimitado
            isActive: true,
        },
    });
    console.log('✅ Plano criado:', plan1.name);

    // Plano 2: Jhonjhon club Corte & Barba
    const plan2 = await prisma.subscriptionPlan.upsert({
        where: { id: 'plan-corte-barba' },
        update: {},
        create: {
            id: 'plan-corte-barba',
            name: 'Jhonjhon club Corte & Barba',
            description: 'Plano mensal com corte de cabelo e barba incluídos',
            price: 129.90,
            durationDays: 30,
            servicesIncluded: 'Corte de cabelo + Barba',
            usageLimit: null, // Ilimitado
            isActive: true,
        },
    });
    console.log('✅ Plano criado:', plan2.name);

    // Plano 3: Jhonjhon club Barba
    const plan3 = await prisma.subscriptionPlan.upsert({
        where: { id: 'plan-barba' },
        update: {},
        create: {
            id: 'plan-barba',
            name: 'Jhonjhon club Barba',
            description: 'Plano mensal com barba incluída',
            price: 75.00,
            durationDays: 30,
            servicesIncluded: 'Barba',
            usageLimit: null, // Ilimitado
            isActive: true,
        },
    });
    console.log('✅ Plano criado:', plan3.name);

    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
