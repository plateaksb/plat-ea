import { NavLink, Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function menuLinkStyle(isActive) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "46px",
    padding: "0 18px",
    borderRadius: "14px",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: "14px",
    border: isActive
      ? "1px solid rgba(255,255,255,0.35)"
      : "1px solid rgba(255,255,255,0.10)",
    background: isActive
      ? "#ffffff"
      : "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
    color: isActive ? "#000000" : "#ffffff",
    boxShadow: isActive
      ? "0 10px 24px rgba(255,255,255,0.10)"
      : "none",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  };
}

export default function AdminLayout() {
  return (
    <div className="page-shell">
      <Navbar />

      <main
        className="section-padding"
        style={{ paddingTop: 40, paddingBottom: 80 }}
      >
        <div className="container">
          <div style={{ marginBottom: "24px" }}>
            <h1 style={{ margin: "0 0 10px", fontSize: "40px" }}>
              Admin Panel
            </h1>
            <p
              style={{
                margin: 0,
                color: "#bbbbbb",
                lineHeight: 1.7,
                maxWidth: "760px",
              }}
            >
              Kelola dashboard, booking masuk, user terdaftar, dan pengaturan tarif
              dalam halaman yang terpisah agar operasional lebih rapi.
            </p>
          </div>

          <div
            className="card-dark"
            style={{
              padding: "16px",
              marginBottom: "22px",
              display: "grid",
              gap: "12px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#9f9f9f",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              MENU ADMIN
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <NavLink
                to="/admin/dashboard"
                style={({ isActive }) => menuLinkStyle(isActive)}
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/admin/bookings"
                style={({ isActive }) => menuLinkStyle(isActive)}
              >
                Booking Masuk
              </NavLink>

              <NavLink
                to="/admin/users"
                style={({ isActive }) => menuLinkStyle(isActive)}
              >
                Data User
              </NavLink>

              <NavLink
                to="/admin/pricing"
                style={({ isActive }) => menuLinkStyle(isActive)}
              >
                Pengaturan Tarif
              </NavLink>
            </div>
          </div>

          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}