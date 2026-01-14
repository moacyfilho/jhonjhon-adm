const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- Services ---");
    const services = await prisma.service.findMany();
    services.forEach(s => console.log(`Service: "${s.name}" (ID: ${s.id}) Price: ${s.price}`));

    console.log("\n--- Alexson Subscription ---");
    const client = await prisma.client.findFirst({
        where: { name: { contains: "Alexson Brito", mode: 'insensitive' } },
        include: { subscriptions: { include: { plan: true } } }
    });

    if (client && client.subscriptions[0]) {
        console.log("Sub JSON Raw:", client.subscriptions[0].servicesIncluded);
        console.log("Plan JSON Raw:", client.subscriptions[0].plan?.servicesIncluded);
    } else {
        console.log("Client or sub not found");
    }
}

main().finally(() => prisma.$disconnect());
