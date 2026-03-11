const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

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
  const plate = normalizeRequiredString(value, "Plat nomor").toUpperCase();
  return plate;
}

function formatDriver(driver) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    vehicleName: driver.vehicleName,
    plateNumber: driver.plateNumber,
    isActive: driver.isActive,
    notes: driver.notes,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  };
}

router.get("/admin/drivers", requireAuth, requireAdmin, async (req, res) => {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    data: drivers.map(formatDriver),
  });
});

router.post("/admin/drivers", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, phone, vehicleName, plateNumber, notes } = req.body || {};

    const safeName = normalizeRequiredString(name, "Nama driver");
    const safePhone = normalizeOptionalString(phone);
    const safeVehicleName = normalizeRequiredString(
      vehicleName,
      "Nama kendaraan"
    );
    const safePlateNumber = normalizePlateNumber(plateNumber);
    const safeNotes = normalizeOptionalString(notes);

    const existingPlate = await prisma.driver.findUnique({
      where: { plateNumber: safePlateNumber },
    });

    if (existingPlate) {
      return res.status(409).json({
        success: false,
        message: "Plat nomor sudah digunakan driver lain",
      });
    }

    const driver = await prisma.driver.create({
      data: {
        name: safeName,
        phone: safePhone,
        vehicleName: safeVehicleName,
        plateNumber: safePlateNumber,
        notes: safeNotes,
        isActive: true,
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
    const { name, phone, vehicleName, plateNumber, notes } = req.body || {};

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

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        name: safeName,
        phone: safePhone,
        vehicleName: safeVehicleName,
        plateNumber: safePlateNumber,
        notes: safeNotes,
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

      const existingBooking = await prisma.booking.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!existingBooking) {
        return res.status(404).json({
          success: false,
          message: "Booking tidak ditemukan",
        });
      }

      if (!driverId) {
        const clearedBooking = await prisma.booking.update({
          where: { id },
          data: {
            driverId: null,
            driverName: null,
            driverPhone: null,
            vehicleName: null,
            plateNumber: null,
          },
          include: {
            user: true,
          },
        });

        return res.json({
          success: true,
          message: "Driver berhasil dilepas dari booking",
          data: {
            id: clearedBooking.id,
            driverId: clearedBooking.driverId,
            driverName: clearedBooking.driverName,
            driverPhone: clearedBooking.driverPhone,
            vehicleName: clearedBooking.vehicleName,
            plateNumber: clearedBooking.plateNumber,
            updatedAt: clearedBooking.updatedAt,
          },
        });
      }

      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver tidak ditemukan",
        });
      }

      if (!driver.isActive) {
        return res.status(400).json({
          success: false,
          message: "Driver nonaktif tidak bisa ditugaskan",
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
        },
        include: {
          user: true,
        },
      });

      return res.json({
        success: true,
        message: "Driver berhasil ditugaskan ke booking",
        data: {
          id: updatedBooking.id,
          driverId: updatedBooking.driverId,
          driverName: updatedBooking.driverName,
          driverPhone: updatedBooking.driverPhone,
          vehicleName: updatedBooking.vehicleName,
          plateNumber: updatedBooking.plateNumber,
          updatedAt: updatedBooking.updatedAt,
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal menugaskan driver",
      });
    }
  }
);

module.exports = router;
