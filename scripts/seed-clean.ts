import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const hashedAdminPassword = await bcrypt.hash('admin123', 10);

  // Usuário admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@jhonjhon.com' },
    update: {},
    create: {
      email: 'admin@jhonjhon.com',
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

  console.log('✅ Created 2 users');
  console.log('\n✨ Seed completed successfully!');
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
