const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const {
  requireAuth,
  requireAdmin,
  requireDriver,
} = require("../middlewares/auth");

const router = express.Router();

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

function normalizePlateNumber(value) {
  return normalizeRequiredString(value, "Plat nomor").toUpperCase();
}

function formatDriver(driver) {
  return {
    id: driver.id,
    userId: driver.userId,
    name: driver.name,
    phone: driver.phone,
    vehicleName: driver.vehicleName,
    plateNumber: driver.plateNumber,
    isActive: driver.isActive,
    notes: driver.notes,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
    user: driver.user
      ? {
          id: driver.user.id,
          name: driver.user.name,
          email: driver.user.email,
          phone: driver.user.phone,
          role: driver.user.role,
          isActive: driver.user.isActive,
          isBlocked: driver.user.isBlocked,
        }
      : null,
  };
}

function formatBooking(booking) {
  return {
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
    assignedAt: booking.assignedAt,
    startedAt: booking.startedAt,
    completedAt: booking.completedAt,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    user: booking.user
      ? {
          id: booking.user.id,
          name: booking.user.name,
          email: booking.user.email,
          phone: booking.user.phone,
          role: booking.user.role,
        }
      : null,
  };
}

async function getDriverProfileByUserId(userId) {
  return prisma.driver.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      user: true,
    },
  });
}

/**
 * =========================
 * ADMIN DRIVER MANAGEMENT
 * =========================
 */

router.get("/admin/drivers", requireAuth, requireAdmin, async (req, res) => {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
    },
  });

  res.json({
    success: true,
    data: drivers.map(formatDriver),
  });
});

router.post(
  "/admin/drivers/create-account",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        vehicleName,
        plateNumber,
        notes,
      } = req.body || {};

      const safeName = normalizeRequiredString(name, "Nama driver");
      const safeEmail = normalizeRequiredString(email, "Email").toLowerCase();
      const safePassword = normalizeRequiredString(password, "Password");
      const safePhone = normalizeOptionalString(phone);
      const safeVehicleName = normalizeRequiredString(
        vehicleName,
        "Nama kendaraan"
      );
      const safePlateNumber = normalizePlateNumber(plateNumber);
      const safeNotes = normalizeOptionalString(notes);

      if (safePassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password minimal 6 karakter",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: safeEmail },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email sudah digunakan",
        });
      }

      const existingPlate = await prisma.driver.findUnique({
        where: { plateNumber: safePlateNumber },
      });

      if (existingPlate) {
        return res.status(409).json({
          success: false,
          message: "Plat nomor sudah digunakan driver lain",
        });
      }

      const hashedPassword = await bcrypt.hash(safePassword, 10);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: safeName,
            email: safeEmail,
            password: hashedPassword,
            phone: safePhone,
            role: "DRIVER",
            isActive: true,
            isBlocked: false,
          },
        });

        const driver = await tx.driver.create({
          data: {
            userId: user.id,
            name: safeName,
            phone: safePhone,
            vehicleName: safeVehicleName,
            plateNumber: safePlateNumber,
            isActive: true,
            notes: safeNotes,
          },
          include: {
            user: true,
          },
        });

        return { user, driver };
      });

      return res.status(201).json({
        success: true,
        message: "Akun driver berhasil dibuat",
        data: formatDriver(result.driver),
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal membuat akun driver",
      });
    }
  }
);

router.post("/admin/drivers", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, phone, vehicleName, plateNumber, notes, userId } =
      req.body || {};

    const safeName = normalizeRequiredString(name, "Nama driver");
    const safePhone = normalizeOptionalString(phone);
    const safeVehicleName = normalizeRequiredString(
      vehicleName,
      "Nama kendaraan"
    );
    const safePlateNumber = normalizePlateNumber(plateNumber);
    const safeNotes = normalizeOptionalString(notes);
    const safeUserId = normalizeOptionalString(userId);

    const existingPlate = await prisma.driver.findUnique({
      where: { plateNumber: safePlateNumber },
    });

    if (existingPlate) {
      return res.status(409).json({
        success: false,
        message: "Plat nomor sudah digunakan driver lain",
      });
    }

    if (safeUserId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: safeUserId },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User driver tidak ditemukan",
        });
      }

      if (existingUser.role !== "DRIVER") {
        return res.status(400).json({
          success: false,
          message: "User yang dipilih belum memiliki role DRIVER",
        });
      }

      const alreadyAttached = await prisma.driver.findFirst({
        where: { userId: safeUserId },
      });

      if (alreadyAttached) {
        return res.status(409).json({
          success: false,
          message: "User ini sudah terhubung ke profil driver lain",
        });
      }
    }

    const driver = await prisma.driver.create({
      data: {
        name: safeName,
        phone: safePhone,
        vehicleName: safeVehicleName,
        plateNumber: safePlateNumber,
        notes: safeNotes,
        userId: safeUserId,
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Driver berhasil ditambahkan",
      data: formatDriver(driver),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal menambahkan driver",
    });
  }
});

router.put("/admin/drivers/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, vehicleName, plateNumber, notes, userId } =
      req.body || {};

    const existing = await prisma.driver.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Driver tidak ditemukan",
      });
    }

    const safeName = normalizeRequiredString(name, "Nama driver");
    const safePhone = normalizeOptionalString(phone);
    const safeVehicleName = normalizeRequiredString(
      vehicleName,
      "Nama kendaraan"
    );
    const safePlateNumber = normalizePlateNumber(plateNumber);
    const safeNotes = normalizeOptionalString(notes);
    const safeUserId = normalizeOptionalString(userId);

    const duplicatedPlate = await prisma.driver.findFirst({
      where: {
        plateNumber: safePlateNumber,
        NOT: { id },
      },
    });

    if (duplicatedPlate) {
      return res.status(409).json({
        success: false,
        message: "Plat nomor sudah digunakan driver lain",
      });
    }

    if (safeUserId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: safeUserId },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User driver tidak ditemukan",
        });
      }

      if (existingUser.role !== "DRIVER") {
        return res.status(400).json({
          success: false,
          message: "User yang dipilih belum memiliki role DRIVER",
        });
      }

      const alreadyAttached = await prisma.driver.findFirst({
        where: {
          userId: safeUserId,
          NOT: { id },
        },
      });

      if (alreadyAttached) {
        return res.status(409).json({
          success: false,
          message: "User ini sudah terhubung ke profil driver lain",
        });
      }
    }

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        name: safeName,
        phone: safePhone,
        vehicleName: safeVehicleName,
        plateNumber: safePlateNumber,
        notes: safeNotes,
        userId: safeUserId,
      },
      include: {
        user: true,
      },
    });

    return res.json({
      success: true,
      message: "Driver berhasil diperbarui",
      data: formatDriver(updatedDriver),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal memperbarui driver",
    });
  }
});

router.put(
  "/admin/drivers/:id/status",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body || {};

      const existing = await prisma.driver.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Driver tidak ditemukan",
        });
      }

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Status driver tidak valid",
        });
      }

      const updatedDriver = await prisma.driver.update({
        where: { id },
        data: { isActive },
        include: {
          user: true,
        },
      });

      return res.json({
        success: true,
        message: "Status driver berhasil diperbarui",
        data: formatDriver(updatedDriver),
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui status driver",
      });
    }
  }
);

router.put(
  "/bookings/:id/assign-driver",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { driverId } = req.body || {};

      if (!driverId || typeof driverId !== "string") {
        return res.status(400).json({
          success: false,
          message: "driverId wajib diisi",
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking tidak ditemukan",
        });
      }

      if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
        return res.status(400).json({
          success: false,
          message:
            "Booking yang sudah selesai atau dibatalkan tidak bisa di-assign",
        });
      }

      const driver = await prisma.driver.findFirst({
        where: {
          id: driverId,
          isActive: true,
        },
        include: {
          user: true,
        },
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver tidak ditemukan atau tidak aktif",
        });
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          vehicleName: driver.vehicleName,
          plateNumber: driver.plateNumber,
          status: "ASSIGNED",
          assignedAt: new Date(),
        },
        include: {
          user: true,
        },
      });

      return res.json({
        success: true,
        message: "Driver berhasil di-assign ke booking",
        data: formatBooking(updatedBooking),
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal assign driver",
      });
    }
  }
);

/**
 * =========================
 * DRIVER PORTAL
 * =========================
 */

router.get("/driver/me", requireAuth, requireDriver, async (req, res) => {
  const driver = await getDriverProfileByUserId(req.user.id);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: "Profil driver tidak ditemukan atau belum aktif",
    });
  }

  return res.json({
    success: true,
    data: formatDriver(driver),
  });
});

router.get("/driver/dashboard", requireAuth, requireDriver, async (req, res) => {
  const driver = await getDriverProfileByUserId(req.user.id);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: "Profil driver tidak ditemukan atau belum aktif",
    });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [assigned, ongoing, completedToday, completedTodayBookings] =
    await Promise.all([
      prisma.booking.count({
        where: {
          driverId: driver.id,
          status: "ASSIGNED",
        },
      }),
      prisma.booking.count({
        where: {
          driverId: driver.id,
          status: "ONGOING",
        },
      }),
      prisma.booking.count({
        where: {
          driverId: driver.id,
          status: "COMPLETED",
          completedAt: {
            gte: startOfDay,
          },
        },
      }),
      prisma.booking.findMany({
        where: {
          driverId: driver.id,
          status: "COMPLETED",
          completedAt: {
            gte: startOfDay,
          },
        },
        select: {
          finalPrice: true,
        },
      }),
    ]);

  const todayRevenue = completedTodayBookings.reduce((sum, item) => {
    return sum + Number(item.finalPrice || 0);
  }, 0);

  return res.json({
    success: true,
    data: {
      assigned,
      ongoing,
      completedToday,
      todayRevenue,
    },
  });
});

router.get("/driver/bookings", requireAuth, requireDriver, async (req, res) => {
  const driver = await getDriverProfileByUserId(req.user.id);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: "Profil driver tidak ditemukan atau belum aktif",
    });
  }

  const { status } = req.query;

  const allowedStatuses = ["ASSIGNED", "ONGOING", "COMPLETED", "CANCELLED"];
  const where = {
    driverId: driver.id,
  };

  if (status) {
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Filter status tidak valid",
      });
    }

    where.status = status;
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: true,
    },
  });

  return res.json({
    success: true,
    data: bookings.map(formatBooking),
  });
});

router.get(
  "/driver/bookings/:id",
  requireAuth,
  requireDriver,
  async (req, res) => {
    const driver = await getDriverProfileByUserId(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Profil driver tidak ditemukan atau belum aktif",
      });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: req.params.id,
        driverId: driver.id,
      },
      include: {
        user: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking driver tidak ditemukan",
      });
    }

    return res.json({
      success: true,
      data: formatBooking(booking),
    });
  }
);

router.patch(
  "/driver/bookings/:id/start",
  requireAuth,
  requireDriver,
  async (req, res) => {
    const driver = await getDriverProfileByUserId(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Profil driver tidak ditemukan atau belum aktif",
      });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: req.params.id,
        driverId: driver.id,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking driver tidak ditemukan",
      });
    }

    if (booking.status !== "ASSIGNED") {
      return res.status(400).json({
        success: false,
        message: "Hanya booking ASSIGNED yang bisa dimulai",
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "ONGOING",
        startedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    return res.json({
      success: true,
      message: "Order berhasil dimulai",
      data: formatBooking(updatedBooking),
    });
  }
);

router.patch(
  "/driver/bookings/:id/complete",
  requireAuth,
  requireDriver,
  async (req, res) => {
    const driver = await getDriverProfileByUserId(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Profil driver tidak ditemukan atau belum aktif",
      });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: req.params.id,
        driverId: driver.id,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking driver tidak ditemukan",
      });
    }

    if (booking.status !== "ONGOING") {
      return res.status(400).json({
        success: false,
        message: "Hanya booking ONGOING yang bisa diselesaikan",
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    return res.json({
      success: true,
      message: "Order berhasil diselesaikan",
      data: formatBooking(updatedBooking),
    });
  }
);

module.exports = router;