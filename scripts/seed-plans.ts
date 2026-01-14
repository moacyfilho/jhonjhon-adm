
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding plans...');

    // 1. Find Services to link (optional but good for semantic `servicesIncluded`)
    const corteService = await prisma.service.findFirst({
        where: { name: { contains: 'Corte', mode: 'insensitive' } },
    });
    const barbaService = await prisma.service.findFirst({
        where: { name: { contains: 'Barba', mode: 'insensitive' } },
    });

    console.log('Service Corte found:', corteService?.id);
    console.log('Service Barba found:', barbaService?.id);

    // Helper to build servicesIncluded JSON
    const buildServicesIncluded = (corte: boolean, barba: boolean) => {
        const included: any = {};
        if (corte && corteService) {
            included[corteService.id] = { unlimited: true, name: corteService.name };
        }
        if (barba && barbaService) {
            included[barbaService.id] = { unlimited: true, name: barbaService.name };
        }
        return JSON.stringify(included);
    };

    const plans = [
        {
            name: 'Jhonjhon Club Corte',
            price: 69.90,
            servicesIncluded: buildServicesIncluded(true, false),
            paymentLink: 'https://mpago.la/placeholder-corte', // Placeholder
        },
        {
            name: 'Jhonjhon Club Corte & Barba',
            price: 129.90,
            servicesIncluded: buildServicesIncluded(true, true),
            paymentLink: 'https://mpago.la/placeholder-completo', // Placeholder
        },
        {
            name: 'Jhonjhon Club Barba',
            price: 75.00,
            servicesIncluded: buildServicesIncluded(false, true),
            paymentLink: 'https://mpago.la/placeholder-barba', // Placeholder
        },
    ];

    for (const plan of plans) {
        const existing = await prisma.plan.findFirst({
            where: { name: plan.name }
        });

        if (existing) {
            console.log(`Updating plan: ${plan.name}`);
            await prisma.plan.update({
                where: { id: existing.id },
                data: {
                    price: plan.price,
                    servicesIncluded: plan.servicesIncluded,
                    isActive: true,
                    // We don't overwrite paymentLink if it exists and we're just updating price, 
                    // but since we are seeding initial values, we might want to set it if missing.
                    // For now, let's just make sure it's active.
                }
            });
        } else {
            console.log(`Creating plan: ${plan.name}`);
            await prisma.plan.create({
                data: {
                    name: plan.name,
                    price: plan.price,
                    servicesIncluded: plan.servicesIncluded,
                    paymentLink: plan.paymentLink,
                    isActive: true,
                }
            });
        }
    }

    console.log('Plans seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
