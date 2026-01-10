
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Starting Duplicate Cleanup for Accounts Receivable...');

        // Find duplicates based on Category "SUBSCRIPTION"
        const accounts = await prisma.accountReceivable.findMany({
            where: {
                category: 'SUBSCRIPTION'
            },
            orderBy: { dueDate: 'asc' }
        });

        const groups = new Map();

        // Grouping
        for (const acc of accounts) {
            // Normalizing key: Payer + Amount + DueDate (YYYY-MM-DD)
            const dateStr = acc.dueDate.toISOString().slice(0, 10);
            const amountStr = acc.amount.toFixed(2);
            const payerStr = (acc.payer || '').trim().toLowerCase();

            const key = `${payerStr}|${amountStr}|${dateStr}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(acc);
        }

        let deletedCount = 0;

        for (const [key, items] of groups.entries()) {
            if (items.length > 1) {
                console.log(`Processing duplicate group: ${key}`);

                // Separation
                const systemEntries = items.filter((i: any) => i.subscriptionId !== null);
                const manualEntries = items.filter((i: any) => i.subscriptionId === null);

                const toDelete = [];

                if (systemEntries.length > 0) {
                    // If we have system entries, delete ALL manual entries found in this group
                    // Note: If we have > 1 system entry (unexpected), we keep all for now to be safe, 
                    // or we could apply logic there too. But here user issue is Manual vs System.
                    toDelete.push(...manualEntries);

                    // If MULTIPLE system entries exist for same day/amount/payer? (Unlikely based on report)
                    if (systemEntries.length > 1) {
                        console.warn("  Warning: Multiple SYSTEM entries found. Keeping all system entries, deleting manuals.");
                    }
                } else {
                    // All are manual. Keep the oldest (First created).
                    // Sort by createdAt
                    manualEntries.sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());
                    const keeper = manualEntries[0];
                    const others = manualEntries.slice(1);
                    toDelete.push(...others);

                    console.log(`  All manual. Keeping ID ${keeper.id}, deleting ${others.length} others.`);
                }

                if (toDelete.length > 0) {
                    const ids = toDelete.map((i: any) => i.id);
                    console.log(`  Deleting ${ids.length} entries: ${ids.join(', ')}`);
                    await prisma.accountReceivable.deleteMany({
                        where: { id: { in: ids } }
                    });
                    deletedCount += ids.length;
                }
            }
        }

        console.log(`\nCleanup Complete. Deleted ${deletedCount} duplicate entries.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
