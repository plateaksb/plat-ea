const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");
const { isMailerConfigured, sendEmail } = require("../lib/mailer");

const router = express.Router();

const RESET_PASSWORD_EXPIRES_MINUTES = 30;

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

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildResetPasswordLink(token) {
  const baseUrl =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173";

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

function buildResetPasswordEmail({ userName, resetLink }) {
  const appName = process.env.APP_NAME || "PLAT EA";

  return {
    subject: `${appName} - Reset Password`,
    text: [
      `Halo ${userName || "Pengguna"},`,
      "",
      `Kami menerima permintaan reset password untuk akun ${appName}.`,
      `Klik link berikut untuk membuat password baru:`,
      resetLink,
      "",
      `Link ini berlaku selama ${RESET_PASSWORD_EXPIRES_MINUTES} menit.`,
      `Jika kamu tidak meminta reset password, abaikan email ini.`,
      "",
      `Terima kasih,`,
      appName,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111111;">
        <h2 style="margin-bottom: 12px;">Reset Password ${appName}</h2>
        <p>Halo ${userName || "Pengguna"},</p>
        <p>Kami menerima permintaan reset password untuk akunmu.</p>
        <p>
          Klik tombol di bawah ini untuk membuat password baru:
        </p>
        <p style="margin: 24px 0;">
          <a
            href="${resetLink}"
            style="
              display: inline-block;
              padding: 12px 18px;
              background: #111111;
              color: #ffffff;
              text-decoration: none;
              border-radius: 10px;
              font-weight: bold;
            "
          >
            Reset Password
          </a>
        </p>
        <p>Atau buka link berikut secara manual:</p>
        <p style="word-break: break-word;">${resetLink}</p>
        <p>Link ini berlaku selama ${RESET_PASSWORD_EXPIRES_MINUTES} menit.</p>
        <p>Jika kamu tidak meminta reset password, abaikan email ini.</p>
        <p>Terima kasih,<br />${appName}</p>
      </div>
    `,
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

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const genericResponse = {
      success: true,
      message: "Jika email terdaftar, link reset password akan dikirim.",
    };

    if (!user) {
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashResetToken(rawToken);
    const expiresAt = new Date(
      Date.now() + RESET_PASSWORD_EXPIRES_MINUTES * 60 * 1000
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    const resetLink = buildResetPasswordLink(rawToken);

    try {
      if (isMailerConfigured()) {
        const emailPayload = buildResetPasswordEmail({
          userName: user.name,
          resetLink,
        });

        await sendEmail({
          to: user.email,
          subject: emailPayload.subject,
          text: emailPayload.text,
          html: emailPayload.html,
        });
      } else if (process.env.NODE_ENV !== "production") {
        console.log("RESET PASSWORD LINK:", {
          email: user.email,
          resetLink,
          expiresAt,
        });
      } else {
        throw new Error("Layanan email belum dikonfigurasi");
      }
    } catch (mailError) {
      console.error("SEND RESET EMAIL ERROR:", mailError);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpiresAt: null,
        },
      });

      return res.status(500).json({
        success: false,
        message: "Gagal mengirim email reset password",
      });
    }

    return res.json({
      ...genericResponse,
      ...(process.env.NODE_ENV !== "production" ? { resetLink } : {}),
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memproses lupa password",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};

    const safeToken = typeof token === "string" ? token.trim() : "";
    const safePassword = typeof password === "string" ? password : "";
    const safeConfirmPassword =
      typeof confirmPassword === "string" ? confirmPassword : "";

    if (!safeToken || !safePassword || !safeConfirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Token, password baru, dan konfirmasi password wajib diisi",
      });
    }

    if (safePassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter",
      });
    }

    if (safePassword !== safeConfirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Konfirmasi password tidak sama",
      });
    }

    const hashedToken = hashResetToken(safeToken);

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token reset password tidak valid atau sudah kedaluwarsa",
      });
    }

    const hashedPassword = await bcrypt.hash(safePassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });

    return res.json({
      success: true,
      message: "Password berhasil direset. Silakan login dengan password baru.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat reset password",
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