import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExclusivePlans() {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            where: {
                name: { contains: 'Exclusiva' }
            }
        });

        console.log('Planos Exclusivos:');
        plans.forEach(plan => {
            console.log(`- ${plan.name}`);
            console.log(`  isExclusive: ${plan.isExclusive}`);
            console.log(`  id: ${plan.id}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkExclusivePlans();
