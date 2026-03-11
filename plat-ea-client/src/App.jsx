import { BrowserRouter, Navigate, Route, Routes, Link, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Booking from "./pages/Booking";
import History from "./pages/History";
import OrderDetail from "./pages/OrderDetail";

import AdminDashboard from "./pages/AdminDashboard";
import AdminBookings from "./pages/AdminBookings";
import AdminPricing from "./pages/AdminPricing";
import AdminUsers from "./pages/AdminUsers";
import AdminDrivers from "./pages/AdminDrivers";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AdminLayout({ title, description, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/bookings", label: "Bookings" },
    { to: "/admin/pricing", label: "Pricing" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/drivers", label: "Drivers" },
  ];

  function isActivePath(path) {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b0b0b",
        color: "#ffffff",
        fontFamily: "Inter, Arial, sans-serif",
        overflowX: "hidden",

      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(11,11,11,0.92)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900 }}>PLAT EA Admin</div>
            <div style={{ marginTop: "4px", fontSize: "13px", color: "#9f9f9f" }}>
              Login sebagai: <strong style={{ color: "#ffffff" }}>{user?.name || "Admin"}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <Link
              to="/"
              className="btn-secondary"
              style={{ textDecoration: "none" }}
            >
              Lihat Website
            </Link>

            <button
              type="button"
              className="btn-secondary"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "100%", margin: "0 auto", padding: "24px 20px 60px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
          className="admin-shell"
        >
          <aside
            className="card-dark"
            style={{
              padding: "18px",
              display: "grid",
              gap: "10px",
              position: "sticky",
              top: "92px",
            }}
          >
            <div style={{ fontSize: "14px", color: "#9f9f9f", fontWeight: 700 }}>
              Navigasi Admin
            </div>

            {navItems.map((item) => {
              const active = isActivePath(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    textDecoration: "none",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    border: active
                      ? "1px solid rgba(255,255,255,0.20)"
                      : "1px solid rgba(255,255,255,0.08)",
                    backgroundColor: active ? "#ffffff" : "rgba(255,255,255,0.03)",
                    color: active ? "#000000" : "#ffffff",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </aside>

          <section style={{ minWidth: 0, display: "grid", gap: "18px" }}>
            <div
              className="card-dark"
              style={{
                padding: "20px",
                display: "grid",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "30px", fontWeight: 900 }}>{title}</div>
              <div style={{ color: "#bdbdbd", lineHeight: 1.7 }}>
                {description}
              </div>
            </div>

            {children}
          </section>
        </div>
      </main>
    </div>
  );
}

function AdminDashboardPage() {
  return (
    <AdminLayout
      title="Dashboard Admin"
      description="Pantau ringkasan operasional, omzet, distribusi layanan, dan status booking PLAT EA."
    >
      <AdminDashboard />
    </AdminLayout>
  );
}

function AdminBookingsPage() {
  return (
    <AdminLayout
      title="Manajemen Booking"
      description="Kelola booking masuk, ubah status order, kirim konfirmasi WhatsApp, dan assign driver ke booking."
    >
      <AdminBookings />
    </AdminLayout>
  );
}

function AdminPricingPage() {
  return (
    <AdminLayout
      title="Manajemen Tarif"
      description="Perbarui tarif layanan taksi, ojek, dan delivery langsung dari panel admin."
    >
      <AdminPricing />
    </AdminLayout>
  );
}

function AdminUsersPage() {
  return (
    <AdminLayout
      title="Manajemen User"
      description="Edit data user, nonaktifkan akun, blokir login, dan pantau statistik pengguna."
    >
      <AdminUsers />
    </AdminLayout>
  );
}

function AdminDriversPage() {
  return (
    <AdminLayout
      title="Manajemen Driver"
      description="Kelola data master driver, aktif/nonaktif driver, dan siapkan driver untuk ditugaskan ke booking."
    >
      <AdminDrivers />
    </AdminLayout>
  );
}

function NotFoundPage() {
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
        className="card-dark"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "32px",
          textAlign: "center",
          display: "grid",
          gap: "14px",
        }}
      >
        <div style={{ fontSize: "34px", fontWeight: 900 }}>404</div>
        <div style={{ fontSize: "22px", fontWeight: 800 }}>Halaman tidak ditemukan</div>
        <p style={{ margin: 0, color: "#bdbdbd", lineHeight: 1.7 }}>
          Halaman yang kamu cari tidak tersedia atau sudah dipindahkan.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "6px",
          }}
        >
          <Link to="/" className="btn-primary" style={{ textDecoration: "none" }}>
            Kembali ke Beranda
          </Link>
          <Link to="/admin" className="btn-secondary" style={{ textDecoration: "none" }}>
            Buka Admin
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/booking"
          element={
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history/:id"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/bookings"
          element={
            <AdminRoute>
              <AdminBookingsPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/pricing"
          element={
            <AdminRoute>
              <AdminPricingPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/drivers"
          element={
            <AdminRoute>
              <AdminDriversPage />
            </AdminRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <style>{`
        @media (max-width: 1024px) {
          .admin-shell {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </BrowserRouter>
  );
}