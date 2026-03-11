require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("../src/lib/prisma");

async function main() {
  const email = "admin@platea.com";
  const password = "Admin12345!";
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Admin PLAT EA",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      phone: "081234567890",
    },
    create: {
      name: "Admin PLAT EA",
      email,
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      phone: "081234567890",
    },
  });

  console.log("Seed admin selesai.");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });