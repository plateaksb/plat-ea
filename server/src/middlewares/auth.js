const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isBlocked: true,
        blockedReason: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Akun dinonaktifkan oleh admin",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: user.blockedReason || "Akun diblokir oleh admin",
      });
    }

    req.user = {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token tidak valid atau sudah kedaluwarsa",
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak",
      });
    }

    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Akses hanya untuk admin",
    });
  }

  next();
}

function requireDriver(req, res, next) {
  if (!req.user || req.user.role !== "DRIVER") {
    return res.status(403).json({
      success: false,
      message: "Akses hanya untuk driver",
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireDriver,
};