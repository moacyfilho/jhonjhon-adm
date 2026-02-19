
import { prisma } from "@/lib/db";

async function fixCaioCorrectly() {
    const id = 'cmlssjxqn0001l409mqqjsano';
    console.log(`Fixing appointment ${id} for Caio Troy...`);

    // 1. Update totalAmount to 0
    const updatedApp = await prisma.appointment.update({
        where: { id },
        data: { totalAmount: 0 }
    });
    console.log(`Updated Total Amount to: ${updatedApp.totalAmount}`);

    // 2. Update the service price to 0 as well to keep data consistent
    // Use updateMany for safety if there are multiple services, but based on investigation there is one
    const updatedServices = await prisma.appointmentService.updateMany({
        where: { appointmentId: id },
        data: { price: 0 }
    });
    console.log(`Updated ${updatedServices.count} services to price 0.`);
}

fixCaioCorrectly()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
