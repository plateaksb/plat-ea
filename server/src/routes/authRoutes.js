const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

function formatUser(user) {
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
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};

    const safeName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const safePassword = typeof password === "string" ? password : "";
    const safePhone =
      typeof phone === "string" && phone.trim() ? phone.trim() : null;

    if (!safeName || !normalizedEmail || !safePassword) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password wajib diisi",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    const hashedPassword = await bcrypt.hash(safePassword, 10);

    const user = await prisma.user.create({
      data: {
        name: safeName,
        email: normalizedEmail,
        phone: safePhone,
        password: hashedPassword,
        role: "USER",
        isActive: true,
        isBlocked: false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      data: formatUser(user),
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat registrasi",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const safePassword = typeof password === "string" ? password : "";

    if (!normalizedEmail || !safePassword) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Akun ini sudah dinonaktifkan. Hubungi admin PLAT EA.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: user.blockedReason || "Akun ini diblokir oleh admin PLAT EA.",
      });
    }

    const isMatch = await bcrypt.compare(safePassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login berhasil",
      data: {
        token,
        user: formatUser(user),
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat login",
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: formatUser(user),
    });
  } catch (error) {
    console.error("ME ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil profil user",
    });
  }
});

module.exports = router;