
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Inspecting Active Subscriptions per Client...');

        const subscriptions = await prisma.subscription.findMany({
            where: { status: 'ACTIVE' },
            include: { client: { select: { id: true, name: true } } }
        });

        const clientSubs = new Map();

        for (const sub of subscriptions) {
            const clientId = sub.clientId;
            if (!clientSubs.has(clientId)) {
                clientSubs.set(clientId, []);
            }
            clientSubs.get(clientId).push(sub);
        }

        let dupes = 0;
        for (const [clientId, subs] of clientSubs.entries()) {
            if (subs.length > 1) {
                dupes++;
                console.log(`User: ${subs[0].client.name} has ${subs.length} ACTIVE subscriptions.`);
                subs.forEach((s: any) => console.log(`  - ID: ${s.id} | Plan: ${s.planName} | Created: ${s.createdAt}`));
            }
        }

        if (dupes === 0) {
            console.log('No clients with multiple active subscriptions found.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
