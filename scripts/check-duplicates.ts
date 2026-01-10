
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Inspecting Subscription Receivables...');

        // Get all receivables linked to a subscription
        const receivables = await prisma.accountReceivable.findMany({
            where: {
                subscriptionId: { not: null }
            },
            include: {
                client: { select: { name: true } },
                subscription: { select: { planName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${receivables.length} receivables linked to subscriptions.`);

        // Group by Subscription + Month/Year
        const grouped = new Map();

        for (const r of receivables) {
            if (!r.dueDate) continue;
            const monthYear = r.dueDate.toISOString().slice(0, 7); // YYYY-MM
            const key = `${r.subscriptionId}|${monthYear}`;

            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(r);
        }

        let duplicateCount = 0;
        for (const [key, items] of grouped.entries()) {
            if (items.length > 1) {
                duplicateCount++;
                const [subId, month] = key.split('|');
                const clientName = items[0].client?.name || 'Unknown';
                const planName = items[0].subscription?.planName || 'Unknown';

                console.log(`\nDUPLICATE FOUND: Client ${clientName} (${planName})`);
                console.log(`  Period: ${month}`);
                console.log(`  Count: ${items.length}`);
                items.forEach((item: any) => {
                    console.log(`    - ID: ${item.id} | Amount: ${item.amount} | CreatedAt: ${item.createdAt}`);
                });
            }
        }

        if (duplicateCount === 0) {
            console.log("\nNo duplicates found based on Subscription + Month.");
        }

    } catch (e) {
        console.error('Error inspecting:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
