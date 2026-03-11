require("dotenv").config();

const express = require("express");
const cors = require("cors");
const prisma = require("./lib/prisma");
const authRoutes = require("./routes/authRoutes");
const mapsRoutes = require("./routes/mapsRoutes");
const driverRoutes = require("./routes/driverRoutes");
const { requireAuth, requireAdmin } = require("./middlewares/auth");

const app = express();

app.disable("x-powered-by");

const rawClientUrls =
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173";

const allowedOrigins = rawClientUrls
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const allowedStatuses = [
  "PENDING",
  "ACCEPTED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
];

const allowedPaymentMethods = ["CASH", "TRANSFER"];

const allowedCancelReasons = [
  "Salah pilih lokasi",
  "Ingin ubah layanan",
  "Harga tidak sesuai",
  "Driver terlalu lama",
  "Pesanan tidak jadi",
  "Alasan lainnya",
];

const allowedRoles = ["USER", "ADMIN"];

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} wajib diisi`);
  }
  return value.trim();
}

function toPositiveNumber(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`${fieldName} harus lebih dari 0`);
  }
  return num;
}

function normalizeOptionalString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeRequiredString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} wajib diisi`);
  }
  return value.trim();
}

function normalizeEmail(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Email wajib diisi");
  }
  return value.trim().toLowerCase();
}

function mapServiceType(service) {
  if (service === "taxi") return "TAXI";
  if (service === "bike") return "BIKE";
  if (service === "delivery") return "DELIVERY";
  throw new Error("Layanan tidak valid");
}

function mapVehicleType(taxiType) {
  if (!taxiType) return null;
  if (taxiType === "car4") return "CAR4";
  if (taxiType === "car6") return "CAR6";
  if (taxiType === "premium") return "PREMIUM";
  throw new Error("Jenis mobil tidak valid");
}

function formatPaymentMethod(method) {
  return method === "TRANSFER" ? "TRANSFER" : "CASH";
}

function buildScheduledBooking(scheduleDate, scheduleTime) {
  if (!scheduleDate && !scheduleTime) {
    return {
      isScheduled: false,
      scheduledAt: null,
    };
  }

  if (!scheduleDate || !scheduleTime) {
    throw new Error("Tanggal dan jam penjemputan harus diisi lengkap");
  }

  const safeDate = String(scheduleDate).trim();
  const safeTime = String(scheduleTime).trim();
  const scheduledAt = new Date(`${safeDate}T${safeTime}:00+08:00`);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Format jadwal booking tidak valid");
  }

  if (scheduledAt.getTime() <= Date.now()) {
    throw new Error("Jadwal booking harus lebih besar dari waktu sekarang");
  }

  return {
    isScheduled: true,
    scheduledAt,
  };
}

async function getActivePricing(service, taxiType = "car4") {
  if (service === "taxi") {
    const rule = await prisma.pricingRule.findUnique({
      where: { key: taxiType },
    });

    if (!rule || rule.section !== "taxiTypes") {
      throw new Error("Jenis mobil tidak valid");
    }

    return rule;
  }

  const rule = await prisma.pricingRule.findUnique({
    where: { key: service },
  });

  if (!rule || rule.section !== "services") {
    throw new Error("Layanan tidak valid");
  }

  return rule;
}

async function calculateBooking(service, taxiType, distance) {
  const active = await getActivePricing(service, taxiType);
  const numericDistance = toPositiveNumber(distance, "Jarak");

  const calculatedPrice = active.baseFare + numericDistance * active.perKm;
  const finalPrice = Math.max(calculatedPrice, active.minimumFare || 0);
  const eta = active.etaBase + Math.ceil(numericDistance * 1.5);

  return {
    vehicleLabel: active.label,
    distance: numericDistance,
    price: finalPrice,
    eta,
    breakdown: {
      baseFare: active.baseFare,
      perKm: active.perKm,
      minimumFare: active.minimumFare || 0,
      calculatedPrice,
      finalPrice,
    },
  };
}

function formatPricingRules(pricingRules) {
  const formatted = {
    taxiTypes: {},
    services: {},
  };

  for (const item of pricingRules) {
    const target =
      item.section === "taxiTypes"
        ? formatted.taxiTypes
        : formatted.services;

    target[item.key] = {
      label: item.label,
      baseFare: item.baseFare,
      perKm: item.perKm,
      minimumFare: item.minimumFare,
      etaBase: item.etaBase,
    };
  }

  return formatted;
}

function formatBookingList(bookings) {
  return bookings.map((booking) => ({
    id: booking.id,
    serviceType: booking.serviceType,
    vehicleType: booking.vehicleType,
    pickup: booking.pickupAddress,
    destination: booking.destinationAddress,
    distance: booking.distanceKm,
    baseFare: booking.baseFare,
    perKm: booking.perKm,
    minimumFare: booking.minimumFare,
    calculatedPrice: booking.calculatedPrice,
    finalPrice: booking.finalPrice,
    eta: booking.etaMinutes,
    status: booking.status,
    paymentMethod: booking.paymentMethod,
    note: booking.note,
    cancelReason: booking.cancelReason,
    isScheduled: booking.isScheduled,
    scheduledAt: booking.scheduledAt,
    driverId: booking.driverId,
    driverName: booking.driverName,
    driverPhone: booking.driverPhone,
    vehicleName: booking.vehicleName,
    plateNumber: booking.plateNumber,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    user: booking.user
      ? {
          id: booking.user.id,
          name: booking.user.name,
          email: booking.user.email,
          phone: booking.user.phone,
          role: booking.user.role,
          isActive: booking.user.isActive,
          isBlocked: booking.user.isBlocked,
          blockedReason: booking.user.blockedReason,
          blockedAt: booking.user.blockedAt,
        }
      : null,
  }));
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PLAT EA backend aktif",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server PLAT EA berjalan",
    environment: process.env.NODE_ENV || "development",
    allowedOrigins,
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      message: "Database terhubung",
    });
  } catch (error) {
    console.error("Health check DB gagal:", error);
    res.status(500).json({
      success: false,
      message: "Database gagal terhubung",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/maps", mapsRoutes);
app.use("/api", driverRoutes);

app.get("/api/pricing", async (req, res) => {
  const pricingRules = await prisma.pricingRule.findMany({
    orderBy: { createdAt: "asc" },
  });

  res.json({
    success: true,
    data: formatPricingRules(pricingRules),
  });
});

app.put("/api/pricing", requireAuth, requireAdmin, async (req, res) => {
  const { section, key, values } = req.body || {};

  if (!section || !key || !values) {
    return res.status(400).json({
      success: false,
      message: "section, key, dan values wajib diisi",
    });
  }

  const existing = await prisma.pricingRule.findUnique({
    where: { key },
  });

  if (!existing || existing.section !== section) {
    return res.status(404).json({
      success: false,
      message: "Data pricing tidak ditemukan",
    });
  }

  await prisma.pricingRule.update({
    where: { key },
    data: {
      label: assertNonEmptyString(values.label, "Label"),
      baseFare: Math.trunc(toPositiveNumber(values.baseFare, "Base fare")),
      perKm: Math.trunc(toPositiveNumber(values.perKm, "Tarif per km")),
      minimumFare: Math.trunc(
        toPositiveNumber(values.minimumFare, "Minimum fare")
      ),
      etaBase: Math.trunc(toPositiveNumber(values.etaBase, "ETA base")),
    },
  });

  const pricingRules = await prisma.pricingRule.findMany({
    orderBy: { createdAt: "asc" },
  });

  res.json({
    success: true,
    message: "Tarif berhasil diperbarui",
    data: formatPricingRules(pricingRules),
  });
});

app.post("/api/bookings/estimate", async (req, res) => {
  const { service, taxiType = "car4", distance } = req.body || {};

  const result = await calculateBooking(service, taxiType, distance);

  res.json({
    success: true,
    message: "Estimasi berhasil dihitung",
    data: result,
  });
});

app.post("/api/bookings", requireAuth, async (req, res) => {
  const {
    service,
    taxiType = "car4",
    pickup,
    destination,
    distance,
    note,
    paymentMethod,
    scheduleDate,
    scheduleTime,
  } = req.body || {};

  const safePickup = assertNonEmptyString(pickup, "Titik jemput");
  const safeDestination = assertNonEmptyString(destination, "Titik tujuan");

  if (!paymentMethod || !allowedPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: "Metode pembayaran tidak valid",
    });
  }

  const result = await calculateBooking(service, taxiType, distance);
  const scheduleInfo = buildScheduledBooking(scheduleDate, scheduleTime);

  const booking = await prisma.booking.create({
    data: {
      user: {
        connect: { id: req.user.sub },
      },
      serviceType: mapServiceType(service),
      vehicleType: service === "taxi" ? mapVehicleType(taxiType) : null,
      pickupAddress: safePickup,
      destinationAddress: safeDestination,
      distanceKm: result.distance,
      baseFare: result.breakdown.baseFare,
      perKm: result.breakdown.perKm,
      minimumFare: result.breakdown.minimumFare,
      calculatedPrice: result.breakdown.calculatedPrice,
      finalPrice: result.breakdown.finalPrice,
      etaMinutes: result.eta,
      status: "PENDING",
      note: typeof note === "string" && note.trim() ? note.trim() : null,
      paymentMethod: formatPaymentMethod(paymentMethod),
      isScheduled: scheduleInfo.isScheduled,
      scheduledAt: scheduleInfo.scheduledAt,
    },
    include: {
      user: true,
    },
  });

  res.status(201).json({
    success: true,
    message: "Booking berhasil dibuat",
    data: {
      id: booking.id,
      serviceType: booking.serviceType,
      vehicleType: booking.vehicleType,
      vehicleLabel: result.vehicleLabel,
      pickup: booking.pickupAddress,
      destination: booking.destinationAddress,
      distance: booking.distanceKm,
      price: booking.finalPrice,
      eta: booking.etaMinutes,
      breakdown: result.breakdown,
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      note: booking.note,
      cancelReason: booking.cancelReason,
      isScheduled: booking.isScheduled,
      scheduledAt: booking.scheduledAt,
      driverId: booking.driverId,
      driverName: booking.driverName,
      driverPhone: booking.driverPhone,
      vehicleName: booking.vehicleName,
      plateNumber: booking.plateNumber,
      createdAt: booking.createdAt,
      user: booking.user
        ? {
            id: booking.user.id,
            name: booking.user.name,
            email: booking.user.email,
            phone: booking.user.phone,
            role: booking.user.role,
            isActive: booking.user.isActive,
            isBlocked: booking.user.isBlocked,
            blockedReason: booking.user.blockedReason,
            blockedAt: booking.user.blockedAt,
          }
        : null,
    },
  });
});

app.get("/api/bookings", requireAuth, requireAdmin, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
    },
  });

  res.json({
    success: true,
    data: formatBookingList(bookings),
  });
});

app.get("/api/my-bookings", requireAuth, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: {
      user: {
        id: req.user.sub,
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
    },
  });

  res.json({
    success: true,
    data: formatBookingList(bookings),
  });
});

app.get("/api/my-bookings/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const booking = await prisma.booking.findFirst({
    where: {
      id,
      user: {
        id: req.user.sub,
      },
    },
    include: {
      user: true,
    },
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Detail booking tidak ditemukan",
    });
  }

  res.json({
    success: true,
    data: formatBookingList([booking])[0],
  });
});

app.put("/api/my-bookings/:id/cancel", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { cancelReason } = req.body || {};

  if (!cancelReason || !allowedCancelReasons.includes(cancelReason)) {
    return res.status(400).json({
      success: false,
      message: "Alasan pembatalan tidak valid",
    });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id,
      user: {
        id: req.user.sub,
      },
    },
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking tidak ditemukan",
    });
  }

  if (!["PENDING", "ACCEPTED"].includes(booking.status)) {
    return res.status(400).json({
      success: false,
      message: "Booking ini tidak bisa dibatalkan lagi",
    });
  }

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelReason,
    },
  });

  res.json({
    success: true,
    message: "Booking berhasil dibatalkan",
    data: {
      id: updatedBooking.id,
      status: updatedBooking.status,
      cancelReason: updatedBooking.cancelReason,
      updatedAt: updatedBooking.updatedAt,
    },
  });
});

app.put(
  "/api/bookings/:id/driver",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { driverName, driverPhone, vehicleName, plateNumber } = req.body || {};

    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Booking tidak ditemukan",
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        driverName:
          typeof driverName === "string" ? driverName.trim() || null : null,
        driverPhone:
          typeof driverPhone === "string" ? driverPhone.trim() || null : null,
        vehicleName:
          typeof vehicleName === "string" ? vehicleName.trim() || null : null,
        plateNumber:
          typeof plateNumber === "string" ? plateNumber.trim() || null : null,
      },
      include: {
        user: true,
      },
    });

    res.json({
      success: true,
      message: "Data driver berhasil diperbarui",
      data: formatBookingList([updatedBooking])[0],
    });
  }
);

app.put(
  "/api/bookings/:id/status",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status booking tidak valid",
      });
    }

    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Booking tidak ditemukan",
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status },
    });

    res.json({
      success: true,
      message: "Status booking berhasil diperbarui",
      data: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        updatedAt: updatedBooking.updatedAt,
      },
    });
  }
);

app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      bookings: {
        select: {
          id: true,
          status: true,
          finalPrice: true,
          createdAt: true,
        },
      },
    },
  });

  const formattedUsers = users.map((user) => {
    const totalBookings = user.bookings.length;
    const completedBookings = user.bookings.filter(
      (booking) => booking.status === "COMPLETED"
    ).length;
    const cancelledBookings = user.bookings.filter(
      (booking) => booking.status === "CANCELLED"
    ).length;
    const totalSpent = user.bookings
      .filter((booking) => booking.status === "COMPLETED")
      .reduce((sum, booking) => sum + Number(booking.finalPrice || 0), 0);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      blockedReason: user.blockedReason,
      blockedAt: user.blockedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalSpent,
      },
    };
  });

  res.json({
    success: true,
    data: formattedUsers,
  });
});

app.put("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body || {};

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    const safeName = normalizeRequiredString(name, "Nama");
    const normalizedEmail = normalizeEmail(email);
    const safePhone = normalizeOptionalString(phone);

    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role user tidak valid",
      });
    }

    if (req.user.sub === id && role !== "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Admin tidak boleh menurunkan role dirinya sendiri",
      });
    }

    const duplicatedEmail = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id },
      },
    });

    if (duplicatedEmail) {
      return res.status(409).json({
        success: false,
        message: "Email sudah digunakan user lain",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: safeName,
        email: normalizedEmail,
        phone: safePhone,
        role,
      },
    });

    return res.json({
      success: true,
      message: "Data user berhasil diperbarui",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal memperbarui user",
    });
  }
});

app.put(
  "/api/admin/users/:id/status",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, isBlocked, blockedReason } = req.body || {};

      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      if (req.user.sub === id && (isActive === false || isBlocked === true)) {
        return res.status(400).json({
          success: false,
          message:
            "Admin tidak boleh menonaktifkan atau memblokir dirinya sendiri",
        });
      }

      const nextIsActive =
        typeof isActive === "boolean" ? isActive : existingUser.isActive;

      const nextIsBlocked =
        typeof isBlocked === "boolean" ? isBlocked : existingUser.isBlocked;

      const nextBlockedReason = nextIsBlocked
        ? normalizeOptionalString(blockedReason) || "Diblokir oleh admin"
        : null;

      const nextBlockedAt = nextIsBlocked
        ? existingUser.isBlocked && existingUser.blockedAt
          ? existingUser.blockedAt
          : new Date()
        : null;

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          isActive: nextIsActive,
          isBlocked: nextIsBlocked,
          blockedReason: nextBlockedReason,
          blockedAt: nextBlockedAt,
        },
      });

      return res.json({
        success: true,
        message: "Status user berhasil diperbarui",
        data: updatedUser,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui status user",
      });
    }
  }
);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
  });
});

app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  console.error(err);

  if (
    err.name === "PrismaClientKnownRequestError" ||
    err.name === "PrismaClientValidationError"
  ) {
    return res.status(400).json({
      success: false,
      message: "Terjadi kesalahan pada data database",
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || "Terjadi kesalahan pada server",
  });
});

module.exports = app;