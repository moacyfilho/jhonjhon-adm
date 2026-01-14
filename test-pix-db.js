const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB Test...');
    const clientId = 'cmkbh82s6000sd44ojkqjatms';

    try {
        console.log(`1. Searching for client ${clientId}...`);
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            console.log('Client not found (might be deleted). Trying to find any client...');
            const first = await prisma.client.findFirst();
            if (first) {
                console.log(`Found another client: ${first.id} (${first.name})`);
                await testClient(first.id);
            } else {
                console.log('No clients in DB.');
            }
        } else {
            console.log(`Found client: ${client.name} (Phone: ${client.phone})`);
            await testClient(client.id);
        }

    } catch (e) {
        console.error('CRITICAL DATABASE ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

async function testClient(id) {
    console.log(`2. Testing update on client ${id} (asaasCustomerId)...`);
    try {
        // Try reading/writing the specific column that might be problematic
        await prisma.client.update({
            where: { id: id },
            data: { asaasCustomerId: 'test_verify' }
        });
        console.log('Update success.');

        // Revert 
        await prisma.client.update({
            where: { id: id },
            data: { asaasCustomerId: null }
        });
        console.log('Revert success.');

    } catch (e) {
        console.error('Update Failed:', e);
    }

    console.log(`3. Testing AccountReceivable creation...`);
    try {
        // Try creating a dummy AR entry like the route does
        await prisma.accountReceivable.create({
            data: {
                description: 'Test Debug',
                category: 'OTHER_INCOME',
                amount: 1.00,
                dueDate: new Date(),
                status: 'PENDING',
                clientId: id,
                // These fields were suspected:
                asaasPaymentId: 'test_pay_id',
                pixQrCode: 'test_qr',
                pixCopyPaste: 'test_copy_paste'
            }
        });
        console.log('AccountReceivable creation success.');
    } catch (e) {
        console.error('AccountReceivable creation Failed:', e);
    }
}

main();
