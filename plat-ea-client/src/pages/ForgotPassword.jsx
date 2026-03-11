import { useState } from "react";
import { Link } from "react-router-dom";
import { buildApiUrl } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(buildApiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal memproses lupa password");
      }

      setSuccessMessage(
        result.message ||
          "Jika email terdaftar, link reset password akan diproses."
      );
      setEmail("");
    } catch (error) {
      setErrorMessage(
        error.message || "Terjadi kesalahan saat memproses lupa password"
      );
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
        <h1 style={{ marginTop: 0, marginBottom: "10px" }}>Lupa Password</h1>
        <p style={{ color: "#b8b8b8", lineHeight: 1.7, marginTop: 0 }}>
          Masukkan email akunmu. Sistem akan memproses link reset password.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: "16px", marginTop: "20px" }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
              Email
            </label>
            <input
              type="email"
              className="input-dark"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email akun"
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
              opacity: loading ? 0.7 : 1,
            }}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Kirim Permintaan Reset"}
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
          <Link to="/register" style={{ color: "#fff" }}>
            Belum punya akun?
          </Link>
        </div>
      </div>
    </div>
  );
}