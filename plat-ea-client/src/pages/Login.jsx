import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(buildApiUrl("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login gagal");
      }

      const token = result.data?.token || result.token || "";
      const loggedInUser = result.data?.user || result.user || null;

      if (!token || !loggedInUser) {
        throw new Error("Response login tidak lengkap");
      }

      login(token, loggedInUser);

      if (loggedInUser.role === "ADMIN") {
        navigate("/admin");
      } else if (loggedInUser.role === "DRIVER") {
        navigate("/driver");
      } else {
        navigate("/");
      }
    } catch (error) {
      setErrorMessage(error.message || "Login gagal");
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
          maxWidth: "420px",
          backgroundColor: "#151515",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "32px",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Masuk ke PLAT EA</h1>
        <p style={{ color: "#b8b8b8", lineHeight: 1.7 }}>
          Login untuk memesan layanan, mengakses dashboard admin, atau portal driver.
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
              placeholder="Masukkan email"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
              Password
            </label>
            <input
              type="password"
              className="input-dark"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "-4px",
            }}
          >
            <Link to="/forgot-password" style={{ color: "#ffffff", fontSize: 14 }}>
              Lupa Password?
            </Link>
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
            {loading ? "Sedang login..." : "Masuk"}
          </button>
        </form>

        <p style={{ marginTop: 18, color: "#b8b8b8", fontSize: 14 }}>
          Belum punya akun?{" "}
          <Link to="/register" style={{ color: "#fff" }}>
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}