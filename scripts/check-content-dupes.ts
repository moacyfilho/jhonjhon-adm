
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Searching for potential manual duplicates...');

        const accounts = await prisma.accountReceivable.findMany({
            where: {
                category: 'SUBSCRIPTION'
            },
            orderBy: { dueDate: 'asc' }
        });

        const groups = new Map();

        for (const acc of accounts) {
            // Create a unique key based on characteristics
            const key = `${acc.payer}|${acc.amount}|${acc.dueDate.toISOString().slice(0, 10)}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(acc);
        }

        let potentialDupes = 0;
        for (const [key, items] of groups.entries()) {
            if (items.length > 1) {
                potentialDupes++;
                console.log(`\nPotential Duplicate Group: ${key}`);
                items.forEach((item: any) => {
                    console.log(`  - ID: ${item.id} | System(SubID): ${item.subscriptionId ? 'YES' : 'NO'} | Created: ${item.createdAt}`);
                });
            }
        }

        if (potentialDupes === 0) {
            console.log("No content-based duplicates found.");
        } else {
            console.log(`\nFound ${potentialDupes} groups of duplicates.`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
