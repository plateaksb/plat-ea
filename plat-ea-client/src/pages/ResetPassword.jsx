import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { buildApiUrl } from "../lib/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      setErrorMessage("Token reset password tidak ditemukan pada link.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password baru minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak sama.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(buildApiUrl("/auth/reset-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal reset password");
      }

      setSuccessMessage(
        result.message ||
          "Password berhasil direset. Silakan login dengan password baru."
      );
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 1600);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b0b0b",
        color: "#ffffff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#151515",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "32px",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "10px" }}>Reset Password</h1>
        <p style={{ color: "#b8b8b8", lineHeight: 1.7, marginTop: 0 }}>
          Masukkan password baru untuk akunmu.
        </p>

        {!token && (
          <div
            style={{
              padding: "14px",
              borderRadius: "14px",
              backgroundColor: "rgba(255, 193, 7, 0.12)",
              border: "1px solid rgba(255, 193, 7, 0.35)",
              color: "#ffe08a",
              fontSize: "14px",
              lineHeight: 1.6,
              marginBottom: "16px",
            }}
          >
            Link reset password tidak valid atau token tidak ditemukan.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: "16px", marginTop: "20px" }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
              Password Baru
            </label>
            <input
              type="password"
              className="input-dark"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password baru"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              className="input-dark"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              required
            />
          </div>

          {errorMessage && (
            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: "rgba(255, 77, 77, 0.12)",
                border: "1px solid rgba(255, 77, 77, 0.35)",
                color: "#ffb3b3",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: "rgba(80, 200, 120, 0.12)",
                border: "1px solid rgba(80, 200, 120, 0.35)",
                color: "#bff0ce",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              marginTop: "8px",
              padding: "14px",
              borderRadius: "14px",
              border: "none",
              backgroundColor: "#ffffff",
              color: "#000000",
              fontWeight: 700,
              cursor: "pointer",
              opacity: loading || !token ? 0.7 : 1,
            }}
            disabled={loading || !token}
          >
            {loading ? "Menyimpan Password..." : "Simpan Password Baru"}
          </button>
        </form>

        <div
          style={{
            marginTop: "18px",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            color: "#b8b8b8",
            fontSize: 14,
          }}
        >
          <Link to="/login" style={{ color: "#fff" }}>
            Kembali ke Login
          </Link>
          <Link to="/forgot-password" style={{ color: "#fff" }}>
            Minta Link Baru
          </Link>
        </div>
      </div>
    </div>
  );
}