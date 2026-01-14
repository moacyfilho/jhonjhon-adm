
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up orphaned records (RAW MODE)...');

    try {
        const deletedServices = await prisma.$executeRawUnsafe(`
        DELETE FROM "AppointmentService" 
        WHERE "appointmentId" NOT IN (SELECT id FROM "Appointment")
      `);
        console.log(`Deleted ${deletedServices} orphaned AppointmentService records.`);

        const deletedProducts = await prisma.$executeRawUnsafe(`
            DELETE FROM "AppointmentProduct" 
            WHERE "appointmentId" NOT IN (SELECT id FROM "Appointment")
      `);
        console.log(`Deleted ${deletedProducts} orphaned AppointmentProduct records.`);

        const deletedMovements = await prisma.$executeRawUnsafe(`
            DELETE FROM "CashMovement" 
            WHERE "cashRegisterId" NOT IN (SELECT id FROM "CashRegister")
      `);
        console.log(`Deleted ${deletedMovements} orphaned CashMovement records.`);

        const deletedLinks = await prisma.$executeRawUnsafe(`
            DELETE FROM "PaymentLink" 
            WHERE "accountReceivableId" NOT IN (SELECT id FROM "AccountReceivable")
      `);
        console.log(`Deleted ${deletedLinks} orphaned PaymentLink records.`);

    } catch (e) {
        console.error("Error executing raw queries:", e);
    }

    console.log('Cleanup complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
