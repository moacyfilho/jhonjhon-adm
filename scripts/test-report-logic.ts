
import { prisma } from "@/lib/db";

async function testDailyReportLogic() {
    try {
        const date = new Date('2026-02-18');
        const startDate = new Date(date); startDate.setUTCHours(0, 0, 0, 0);
        const endDate = new Date(date); endDate.setUTCHours(23, 59, 59, 999);

        console.log("Testing Daily Report Logic locally...");

        const appointments = await prisma.appointment.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: "COMPLETED",
            },
            include: {
                client: { select: { name: true } },
                barber: { select: { name: true } },
                services: {
                    select: {
                        serviceId: true,
                        price: true,
                        service: {
                            select: { name: true }
                        }
                    }
                },
                products: {
                    include: {
                        product: { select: { name: true } }
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        console.log(`Found ${appointments.length} appointments.`);

        appointments.forEach(app => {
            console.log(`App ID: ${app.id}, Total: ${app.totalAmount}`);
            const totalServicePrices = app.services.reduce((sum, s) => sum + s.price, 0);
            console.log(`  - Services Sum: ${totalServicePrices}`);
            app.services.forEach(s => {
                console.log(`    - Service: ${s.service.name}, Price: ${s.price}`);
            });
        });

        console.log("Logic execution successful.");

    } catch (error) {
        console.error("Logic execution FAILED:", error);
    }
}

testDailyReportLogic()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
