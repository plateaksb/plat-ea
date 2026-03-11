import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/Logo.png";
import InstallPWAButton from "./InstallPWAButton";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(10px)",
        backgroundColor: "rgba(8,8,8,0.72)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="container section-padding"
        style={{ paddingTop: 16, paddingBottom: 16 }}
      >
        <div className="nav-wrap">
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textDecoration: "none",
              color: "#ffffff",
              minWidth: 0,
              flexShrink: 0,
            }}
          >
            <img
              src={logo}
              alt="PLAT EA Logo"
              style={{
                width: "46px",
                height: "46px",
                objectFit: "contain",
                borderRadius: "12px",
                backgroundColor: "#ffffff",
                padding: "4px",
                flexShrink: 0,
              }}
            />

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                PLAT EA
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#b5b5b5",
                  lineHeight: 1.3,
                }}
              >
                Transportasi & Delivery Platform
              </div>
            </div>
          </Link>

          <nav className="nav-menu">
            <Link
              to="/"
              style={{
                color: "#d7d7d7",
                textDecoration: "none",
                fontSize: "14px",
                padding: "8px 10px",
              }}
            >
              Beranda
            </Link>

            <Link
              to="/booking"
              style={{
                color: "#d7d7d7",
                textDecoration: "none",
                fontSize: "14px",
                padding: "8px 10px",
              }}
            >
              Booking
            </Link>

            {isAuthenticated && !isAdmin && (
              <Link
                to="/history"
                style={{
                  color: "#d7d7d7",
                  textDecoration: "none",
                  fontSize: "14px",
                  padding: "8px 10px",
                }}
              >
                Riwayat
              </Link>
            )}

            {isAuthenticated && isAdmin && (
              <Link
                to="/admin"
                style={{
                  color: "#d7d7d7",
                  textDecoration: "none",
                  fontSize: "14px",
                  padding: "8px 10px",
                }}
              >
                Admin
              </Link>
            )}

            {!isAuthenticated && (
              <>
                <Link
                  to="/login"
                  style={{
                    color: "#d7d7d7",
                    textDecoration: "none",
                    fontSize: "14px",
                    padding: "8px 10px",
                  }}
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  style={{
                    color: "#d7d7d7",
                    textDecoration: "none",
                    fontSize: "14px",
                    padding: "8px 10px",
                  }}
                >
                  Register
                </Link>
              </>
            )}

            <InstallPWAButton />

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  minHeight: "42px",
                  whiteSpace: "nowrap",
                }}
              >
                Logout {user?.name ? `(${user.name})` : ""}
              </button>
            ) : (
              <Link
                to="/login"
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  fontWeight: 700,
                  minHeight: "42px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}