import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking ALL Subscription Plans...');

    const plans = await prisma.subscriptionPlan.findMany({
        orderBy: { name: 'asc' }
    });

    console.log(`Found ${plans.length} plans.`);

    plans.forEach(plan => {
        console.log(`- [${plan.isActive ? 'ACTIVE' : 'INACTIVE'}] ${plan.name} (Exclusive: ${plan.isExclusive}) - ID: ${plan.id}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
