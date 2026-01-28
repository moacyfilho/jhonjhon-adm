import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash da senha padrão
  const hashedDefaultPassword = await bcrypt.hash('johndoe123', 10);
  const hashedAdminPassword = await bcrypt.hash('admin123', 10);

  // 1. Criar usuários
  console.log('Creating users...');

  // Usuário de teste (não mencionar ao usuário)
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedDefaultPassword,
      role: 'ADMIN',
    },
  });

  // Usuário admin visível
  const adminUser = await prisma.user.upsert({
    where: { email: 'Admin@jhonjhon.com' },
    update: {},
    create: {
      email: 'Admin@jhonjhon.com',
      name: 'Administrador',
      password: hashedAdminPassword,
      role: 'ADMIN',
    },
  });

  // Usuário secretária
  const secretaryUser = await prisma.user.upsert({
    where: { email: 'secretaria@jhonjhon.com' },
    update: {},
    create: {
      email: 'secretaria@jhonjhon.com',
      name: 'Secretária',
      password: hashedAdminPassword,
      role: 'SECRETARY',
    },
  });

  console.log(`✅ Created ${3} users`);

  // 2. Criar barbeiros
  console.log('Creating barbers...');

  const barber1 = await prisma.barber.create({
    data: {
      name: 'Carlos Silva',
      phone: '(11) 98765-4321',
      email: 'carlos@jhonjhon.com',
      commissionRate: 50, // 50% de comissão
      isActive: true,
    },
  });

  const barber2 = await prisma.barber.create({
    data: {
      name: 'Rafael Santos',
      phone: '(11) 98765-1234',
      email: 'rafael@jhonjhon.com',
      commissionRate: 45, // 45% de comissão
      isActive: true,
    },
  });

  const barber3 = await prisma.barber.create({
    data: {
      name: 'Bruno Oliveira',
      phone: '(11) 98765-5678',
      email: 'bruno@jhonjhon.com',
      commissionRate: 40, // 40% de comissão
      isActive: true,
    },
  });

  console.log(`✅ Created ${3} barbers`);

  // 3. Criar serviços
  console.log('Creating services...');

  const service1 = await prisma.service.create({
    data: {
      name: 'Corte Tradicional',
      description: 'Corte de cabelo clássico masculino',
      price: 50.00,
      duration: 30,
      isActive: true,
    },
  });

  const service2 = await prisma.service.create({
    data: {
      name: 'Corte + Barba',
      description: 'Corte de cabelo + barba completa',
      price: 80.00,
      duration: 45,
      isActive: true,
    },
  });

  const service3 = await prisma.service.create({
    data: {
      name: 'Barba',
      description: 'Aparar e modelar barba',
      price: 35.00,
      duration: 20,
      isActive: true,
    },
  });

  const service4 = await prisma.service.create({
    data: {
      name: 'Corte Premium',
      description: 'Corte de cabelo estilizado + finalização',
      price: 75.00,
      duration: 40,
      isActive: true,
    },
  });

  const service5 = await prisma.service.create({
    data: {
      name: 'Sobrancelha',
      description: 'Design de sobrancelhas',
      price: 20.00,
      duration: 15,
      isActive: true,
    },
  });

  const service6 = await prisma.service.create({
    data: {
      name: 'Hidratação Capilar',
      description: 'Tratamento hidratante para cabelos',
      price: 45.00,
      duration: 30,
      isActive: true,
    },
  });

  console.log(`✅ Created ${6} services`);

  // 4. Criar clientes
  console.log('Creating clients...');

  const client1 = await prisma.client.create({
    data: {
      name: 'João da Silva',
      phone: '(11) 99999-1111',
      email: 'joao.silva@email.com',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Pedro Souza',
      phone: '(11) 99999-2222',
      email: 'pedro.souza@email.com',
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name: 'Lucas Mendes',
      phone: '(11) 99999-3333',
    },
  });

  const client4 = await prisma.client.create({
    data: {
      name: 'Marcos Alves',
      phone: '(11) 99999-4444',
      email: 'marcos.alves@email.com',
    },
  });

  const client5 = await prisma.client.create({
    data: {
      name: 'Felipe Costa',
      phone: '(11) 99999-5555',
    },
  });

  console.log(`✅ Created ${5} clients`);

  // 5. Criar alguns atendimentos de exemplo (últimos 30 dias)
  console.log('Creating sample appointments...');

  const now = new Date();
  const dates = [
    new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
    new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
    new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 dias atrás
    new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 dias atrás
    new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 dias atrás
    new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 dias atrás
  ];

  // Atendimento 1
  const appointment1 = await prisma.appointment.create({
    data: {
      clientId: client1.id,
      barberId: barber1.id,
      date: dates[0],
      status: 'COMPLETED',
      paymentMethod: 'PIX',
      totalAmount: 80.00,
      observations: 'Cliente satisfeito',
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment1.id,
      serviceId: service2.id,
      price: 80.00,
    },
  });

  await prisma.commission.create({
    data: {
      appointmentId: appointment1.id,
      barberId: barber1.id,
      amount: 40.00, // 50% de 80
      status: 'PENDING',
    },
  });

  // Atendimento 2
  const appointment2 = await prisma.appointment.create({
    data: {
      clientId: client2.id,
      barberId: barber2.id,
      date: dates[1],
      status: 'COMPLETED',
      paymentMethod: 'CASH',
      totalAmount: 50.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment2.id,
      serviceId: service1.id,
      price: 50.00,
    },
  });

  await prisma.commission.create({
    data: {
      appointmentId: appointment2.id,
      barberId: barber2.id,
      amount: 22.50, // 45% de 50
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  // Atendimento 3
  const appointment3 = await prisma.appointment.create({
    data: {
      clientId: client3.id,
      barberId: barber1.id,
      date: dates[2],
      status: 'COMPLETED',
      paymentMethod: 'CREDIT_CARD',
      totalAmount: 110.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment3.id,
      serviceId: service2.id,
      price: 80.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment3.id,
      serviceId: service5.id,
      price: 20.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment3.id,
      serviceId: service6.id,
      price: 10.00,
    },
  });

  await prisma.commission.create({
    data: {
      appointmentId: appointment3.id,
      barberId: barber1.id,
      amount: 55.00, // 50% de 110
      status: 'PENDING',
    },
  });

  // Atendimento 4
  const appointment4 = await prisma.appointment.create({
    data: {
      clientId: client4.id,
      barberId: barber3.id,
      date: dates[3],
      status: 'COMPLETED',
      paymentMethod: 'DEBIT_CARD',
      totalAmount: 75.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment4.id,
      serviceId: service4.id,
      price: 75.00,
    },
  });

  await prisma.commission.create({
    data: {
      appointmentId: appointment4.id,
      barberId: barber3.id,
      amount: 30.00, // 40% de 75
      status: 'PENDING',
    },
  });

  // Atendimento 5
  const appointment5 = await prisma.appointment.create({
    data: {
      clientId: client5.id,
      barberId: barber2.id,
      date: dates[4],
      status: 'COMPLETED',
      paymentMethod: 'PIX',
      totalAmount: 85.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment5.id,
      serviceId: service1.id,
      price: 50.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment5.id,
      serviceId: service3.id,
      price: 35.00,
    },
  });

  await prisma.commission.create({
    data: {
      appointmentId: appointment5.id,
      barberId: barber2.id,
      amount: 38.25, // 45% de 85
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  // Atendimento 6
  const appointment6 = await prisma.appointment.create({
    data: {
      clientId: client1.id,
      barberId: barber1.id,
      date: dates[5],
      status: 'COMPLETED',
      paymentMethod: 'CASH',
      totalAmount: 50.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment6.id,
      serviceId: service1.id,
      price: 50.00,
    },
  });

  await prisma.commission.create({
    data: {
      appointmentId: appointment6.id,
      barberId: barber1.id,
      amount: 25.00, // 50% de 50
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  // Atendimento 7
  const appointment7 = await prisma.appointment.create({
    data: {
      clientId: client2.id,
      barberId: barber3.id,
      date: dates[6],
      status: 'COMPLETED',
      paymentMethod: 'CREDIT_CARD',
      totalAmount: 95.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment7.id,
      serviceId: service4.id,
      price: 75.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment7.id,
      serviceId: service5.id,
      price: 20.00,
    },
  });

  await prisma.commission.create({
    data: {
      appointmentId: appointment7.id,
      barberId: barber3.id,
      amount: 38.00, // 40% de 95
      status: 'PENDING',
    },
  });

  // Atendimento 8
  const appointment8 = await prisma.appointment.create({
    data: {
      clientId: client3.id,
      barberId: barber2.id,
      date: dates[7],
      status: 'COMPLETED',
      paymentMethod: 'PIX',
      totalAmount: 35.00,
    },
  });

  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment8.id,
      serviceId: service3.id,
      price: 35.00,
    },
  });

  await prisma.commission.create({
    data: {
      appointmentId: appointment8.id,
      barberId: barber2.id,
      amount: 15.75, // 45% de 35
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  console.log(`✅ Created ${8} appointments with services and commissions`);

  console.log('\n✨ Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   - 3 users (Admin, Secretary)');
  console.log('   - 3 barbers');
  console.log('   - 6 services');
  console.log('   - 5 clients');
  console.log('   - 8 appointments with services and commissions');
  console.log('\n🔐 Login credentials:');
  console.log('   Admin: admin@jhonjhon.com / admin123');
  console.log('   Secretaria: secretaria@jhonjhon.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
