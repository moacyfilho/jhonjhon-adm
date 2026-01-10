import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Obter configurações
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Busca a primeira configuração (deve haver apenas uma)
    let settings = await prisma.bookingSettings.findFirst();

    // Se não existir, cria com valores padrão
    if (!settings) {
      settings = await prisma.bookingSettings.create({
        data: {
          schedule: {
            monday: { enabled: true, slots: [] },
            tuesday: { enabled: true, slots: [] },
            wednesday: { enabled: true, slots: [] },
            thursday: { enabled: true, slots: [] },
            friday: { enabled: true, slots: [] },
            saturday: { enabled: false, slots: [] },
            sunday: { enabled: false, slots: [] },
          },
          serviceIds: [],
          barberIds: [],
          slotDuration: 30,
          advanceBookingDays: 30,
          minimumNotice: 2,
        },
      });
    }

    // Buscar serviços e barbeiros para retornar com detalhes
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, duration: true },
    });

    const barbers = await prisma.barber.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      settings,
      availableServices: services,
      availableBarbers: barbers,
    });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar configurações
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      schedule,
      serviceIds,
      barberIds,
      slotDuration,
      advanceBookingDays,
      minimumNotice,
    } = body;

    // Validações
    if (!schedule || !serviceIds || !barberIds) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Busca a primeira configuração
    const existingSettings = await prisma.bookingSettings.findFirst();

    let settings;
    if (existingSettings) {
      // Atualiza
      settings = await prisma.bookingSettings.update({
        where: { id: existingSettings.id },
        data: {
          schedule,
          serviceIds,
          barberIds,
          slotDuration: slotDuration || 30,
          advanceBookingDays: advanceBookingDays || 30,
          minimumNotice: minimumNotice || 2,
        },
      });
    } else {
      // Cria
      settings = await prisma.bookingSettings.create({
        data: {
          schedule,
          serviceIds,
          barberIds,
          slotDuration: slotDuration || 30,
          advanceBookingDays: advanceBookingDays || 30,
          minimumNotice: minimumNotice || 2,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
      { status: 500 }
    );
  }
}
