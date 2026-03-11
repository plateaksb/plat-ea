const prisma = require("../src/lib/prisma");

async function main() {
  const pricingRules = [
    {
      section: "taxiTypes",
      key: "car4",
      label: "Mobil Kapasitas 4 Orang",
      baseFare: 7000,
      perKm: 4000,
      minimumFare: 15000,
      etaBase: 8,
    },
    {
      section: "taxiTypes",
      key: "car6",
      label: "Mobil Kapasitas 6 Orang",
      baseFare: 10000,
      perKm: 5000,
      minimumFare: 20000,
      etaBase: 8,
    },
    {
      section: "taxiTypes",
      key: "premium",
      label: "Mobil Premium",
      baseFare: 15000,
      perKm: 7000,
      minimumFare: 30000,
      etaBase: 8,
    },
    {
      section: "services",
      key: "bike",
      label: "Ojek Roda Dua",
      baseFare: 5000,
      perKm: 2500,
      minimumFare: 10000,
      etaBase: 5,
    },
    {
      section: "services",
      key: "delivery",
      label: "Delivery Barang",
      baseFare: 8000,
      perKm: 3000,
      minimumFare: 15000,
      etaBase: 10,
    },
  ];

  for (const item of pricingRules) {
    await prisma.pricingRule.upsert({
      where: { key: item.key },
      update: item,
      create: item,
    });
  }

  console.log("Seed pricing selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });