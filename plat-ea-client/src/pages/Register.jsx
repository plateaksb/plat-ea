import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register, loginWithCredentials } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");

      await register(form);
      await loginWithCredentials(form.email, form.password);

      navigate("/");
    } catch (error) {
      setErrorMessage(error.message || "Registrasi gagal");
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
        <h1 style={{ marginTop: 0 }}>Daftar Akun PLAT EA</h1>
        <p style={{ color: "#b8b8b8", lineHeight: 1.7 }}>
          Buat akun untuk memesan layanan dan melihat riwayat booking.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
              Nama Lengkap
            </label>
            <input
              type="text"
              className="input-dark"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
              Email
            </label>
            <input
              type="email"
              className="input-dark"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
              Nomor HP
            </label>
            <input
              type="text"
              className="input-dark"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
              Password
            </label>
            <input
              type="password"
              className="input-dark"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
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
            {loading ? "Sedang mendaftar..." : "Daftar"}
          </button>
        </form>

        <p style={{ marginTop: 18, color: "#b8b8b8", fontSize: 14 }}>
          Sudah punya akun?{" "}
          <Link to="/login" style={{ color: "#fff" }}>
            Login di sini
          </Link>
        </p>
      </div>
    </div>
  );
}