const pricingConfig = {
  taxiTypes: {
    car4: {
      label: "Mobil Kapasitas 4 Orang",
      baseFare: 7000,
      perKm: 4000,
      etaBase: 8,
      minimumFare: 100000,
    },
    car6: {
      label: "Mobil Kapasitas 6 Orang",
      baseFare: 10000,
      perKm: 5000,
      etaBase: 8,
      minimumFare: 150000,
    },
    premium: {
      label: "Mobil Premium",
      baseFare: 15000,
      perKm: 7000,
      etaBase: 8,
      minimumFare: 2000000,
    },
  },
  services: {
    bike: {
      label: "Ojek Roda Dua",
      baseFare: 5000,
      perKm: 2500,
      etaBase: 5,
      minimumFare: 20000,
    },
    delivery: {
      label: "Delivery Barang",
      baseFare: 8000,
      perKm: 3000,
      etaBase: 10,
      minimumFare: 15000,
    },
  },
};

module.exports = pricingConfig;