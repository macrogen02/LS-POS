import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordAdmin = await bcrypt.hash('admin123', 10);
  const passwordStaff = await bcrypt.hash('staff123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@laundrypos.local' },
    update: { name: 'Admin User', passwordHash: passwordAdmin, role: Role.admin },
    create: { name: 'Admin User', email: 'admin@laundrypos.local', passwordHash: passwordAdmin, role: Role.admin }
  });

  await prisma.user.upsert({
    where: { email: 'staff@laundrypos.local' },
    update: { name: 'Staff User', passwordHash: passwordStaff, role: Role.staff },
    create: { name: 'Staff User', email: 'staff@laundrypos.local', passwordHash: passwordStaff, role: Role.staff }
  });

  for (const service of [
    { name: 'Wash', pricePerKg: 3.0 },
    { name: 'Dry', pricePerKg: 2.0 },
    { name: 'Fold', pricePerKg: 1.5 },
  ]) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: { pricePerKg: service.pricePerKg },
      create: service
    });
  }

  for (const item of [
    { itemName: 'Detergent', quantity: 30, unit: 'kg', reorderLevel: 10 },
    { itemName: 'Softener', quantity: 20, unit: 'L', reorderLevel: 8 },
    { itemName: 'Laundry Bags', quantity: 100, unit: 'pcs', reorderLevel: 30 }
  ]) {
    const found = await prisma.inventory.findFirst({ where: { itemName: item.itemName } });
    if (!found) await prisma.inventory.create({ data: item });
  }
}

main().finally(async () => prisma.$disconnect());
