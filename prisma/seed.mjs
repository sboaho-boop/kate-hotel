import { PrismaClient, Role, RoomType, NfcStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || "superadmin@hotel.test";
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || "Super@123";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@hotel.test";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash: await bcrypt.hash(superAdminPassword, 10),
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: "Hotel Admin",
      role: Role.ADMIN,
    },
  });

  const sampleRooms = [
    { number: "101", floor: 1, type: RoomType.SINGLE, capacity: 1, price: 4500 },
    { number: "102", floor: 1, type: RoomType.SINGLE, capacity: 1, price: 4500 },
    { number: "103", floor: 1, type: RoomType.DOUBLE, capacity: 2, price: 6500 },
    { number: "104", floor: 1, type: RoomType.DOUBLE, capacity: 2, price: 6500 },
    { number: "201", floor: 2, type: RoomType.TWIN, capacity: 2, price: 7800 },
    { number: "202", floor: 2, type: RoomType.SUITE, capacity: 3, price: 12500 },
    { number: "203", floor: 2, type: RoomType.FAMILY, capacity: 4, price: 14500 },
    { number: "301", floor: 3, type: RoomType.DELUXE, capacity: 2, price: 18000 },
  ];

  let roomCount = 0;
  for (const r of sampleRooms) {
    const existing = await prisma.room.findUnique({ where: { number: r.number } });
    if (!existing) {
      await prisma.room.create({ data: r });
      roomCount++;
    }
  }

  let cardCount = 0;
  for (let i = 0; i < 10; i++) {
    const uid = `NFC-${String(1000 + i).padStart(4, "0")}`;
    const existing = await prisma.nfcCard.findUnique({ where: { uid } });
    if (!existing) {
      await prisma.nfcCard.create({
        data: { uid, status: NfcStatus.UNASSIGNED },
      });
      cardCount++;
    }
  }

  console.log("Seeded:");
  console.log("  Super admin  ->", superAdmin.email);
  console.log("  Admin        ->", admin.email);
  console.log(`  Rooms created -> ${roomCount} (${sampleRooms.length} total configured)`);
  console.log(`  NFC cards     -> ${cardCount} created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
