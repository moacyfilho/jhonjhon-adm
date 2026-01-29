import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Configurando horários de funcionamento...');

    const schedule = [
        { day: 'MONDAY', startTime: '09:00', endTime: '19:30', isOpen: true },
        { day: 'TUESDAY', startTime: '09:00', endTime: '19:30', isOpen: true },
        { day: 'WEDNESDAY', startTime: '09:00', endTime: '19:30', isOpen: true },
        { day: 'THURSDAY', startTime: '09:00', endTime: '19:30', isOpen: true },
        { day: 'FRIDAY', startTime: '09:00', endTime: '19:30', isOpen: true },
        { day: 'SATURDAY', startTime: '09:00', endTime: '19:30', isOpen: true },
        { day: 'SUNDAY', startTime: '09:00', endTime: '18:00', isOpen: false },
    ];

    for (const config of schedule) {
        const existing = await prisma.businessHours.findFirst({
            where: { dayOfWeek: config.day as any },
        });

        if (existing) {
            await prisma.businessHours.update({
                where: { id: existing.id },
                data: {
                    startTime: config.startTime,
                    endTime: config.endTime,
                    isOpen: config.isOpen,
                },
            });
            console.log(`✅ Atualizado: ${config.day} - ${config.isOpen ? `${config.startTime} às ${config.endTime}` : 'FECHADO'}`);
        } else {
            await prisma.businessHours.create({
                data: {
                    dayOfWeek: config.day as any,
                    startTime: config.startTime,
                    endTime: config.endTime,
                    isOpen: config.isOpen,
                },
            });
            console.log(`✅ Criado: ${config.day} - ${config.isOpen ? `${config.startTime} às ${config.endTime}` : 'FECHADO'}`);
        }
    }

    console.log('\n✨ Horários configurados com sucesso!');
    console.log('📅 Segunda a Sábado: 09:00 às 19:30');
    console.log('📅 Domingo: FECHADO');
}

main()
    .catch((e) => {
        console.error('❌ Erro:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
