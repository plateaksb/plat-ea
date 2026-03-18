import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Booking from "./pages/Booking";
import History from "./pages/History";
import OrderDetail from "./pages/OrderDetail";

import AdminDashboard from "./pages/AdminDashboard";
import AdminBookings from "./pages/AdminBookings";
import AdminPricing from "./pages/AdminPricing";
import AdminUsers from "./pages/AdminUsers";
import AdminDrivers from "./pages/AdminDrivers";

import DriverDashboard from "./pages/DriverDashboard";
import DriverOrders from "./pages/DriverOrders";
import DriverOrderDetail from "./pages/DriverOrderDetail";

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= breakpoint);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

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

function DriverRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "DRIVER") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PanelLayout({ brandTitle, title, description, navItems, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  function isActivePath(path) {
    if (location.pathname === path) return true;
    return path !== "/" && location.pathname.startsWith(path);
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
            padding: isMobile ? "14px 16px" : "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: "16px",
            flexWrap: "wrap",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <div>
            <div style={{ fontSize: isMobile ? "20px" : "22px", fontWeight: 900 }}>
              {brandTitle}
            </div>
            <div style={{ marginTop: "4px", fontSize: "13px", color: "#9f9f9f" }}>
              Login sebagai:{" "}
              <strong style={{ color: "#ffffff" }}>{user?.name || "-"}</strong>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <Link
              to="/"
              className="btn-secondary"
              style={{
                textDecoration: "none",
                flex: isMobile ? 1 : "unset",
                textAlign: "center",
              }}
            >
              Lihat Website
            </Link>

            <button
              type="button"
              className="btn-secondary"
              onClick={logout}
              style={{
                flex: isMobile ? 1 : "unset",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          width: "100%",
          margin: "0 auto",
          padding: isMobile ? "16px" : "24px 20px 60px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "280px minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          <aside
            className="card-dark"
            style={{
              padding: "18px",
              display: "grid",
              gap: "10px",
              position: isMobile ? "static" : "sticky",
              top: isMobile ? "auto" : "92px",
              order: isMobile ? 1 : 0,
            }}
          >
            <div style={{ fontSize: "14px", color: "#9f9f9f", fontWeight: 700 }}>
              Navigasi
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr",
                gap: "10px",
              }}
            >
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
                      textAlign: "left",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </aside>

          <section
            style={{
              minWidth: 0,
              display: "grid",
              gap: "18px",
              order: isMobile ? 2 : 0,
            }}
          >
            <div
              className="card-dark"
              style={{
                padding: isMobile ? "18px" : "20px",
                display: "grid",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? "22px" : "30px",
                  fontWeight: 900,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  color: "#bdbdbd",
                  lineHeight: 1.7,
                  fontSize: isMobile ? "15px" : "16px",
                }}
              >
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

function AdminLayout({ title, description, children }) {
  const navItems = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/bookings", label: "Bookings" },
    { to: "/admin/pricing", label: "Pricing" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/drivers", label: "Drivers" },
  ];

  return (
    <PanelLayout
      brandTitle="PLAT EA Admin"
      title={title}
      description={description}
      navItems={navItems}
    >
      {children}
    </PanelLayout>
  );
}

function DriverLayout({ title, description, children }) {
  const navItems = [
    { to: "/driver", label: "Dashboard" },
    { to: "/driver/orders", label: "Order Saya" },
  ];

  return (
    <PanelLayout
      brandTitle="PLAT EA Driver"
      title={title}
      description={description}
      navItems={navItems}
    >
      {children}
    </PanelLayout>
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
      description="Kelola data master driver, buat akun driver baru, aktif/nonaktif driver, dan siapkan driver untuk ditugaskan ke booking."
    >
      <AdminDrivers />
    </AdminLayout>
  );
}

function DriverDashboardPage() {
  return (
    <DriverLayout
      title="Dashboard Driver"
      description="Lihat ringkasan tugas, order aktif, dan hasil penyelesaian order hari ini."
    >
      <DriverDashboard />
    </DriverLayout>
  );
}

function DriverOrdersPage() {
  return (
    <DriverLayout
      title="Order Saya"
      description="Kelola order yang ditugaskan ke akun driver ini, mulai order, dan tandai order sebagai selesai."
    >
      <DriverOrders />
    </DriverLayout>
  );
}

function DriverOrderDetailPage() {
  return (
    <DriverLayout
      title="Detail Order Driver"
      description="Lihat detail order, informasi pelanggan, rute, dan lakukan aksi sesuai status order."
    >
      <DriverOrderDetail />
    </DriverLayout>
  );
}

function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b0b0b",
        color: "#ffffff",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <div className="card-dark" style={{ maxWidth: "560px", width: "100%", padding: "28px" }}>
        <div style={{ fontSize: "38px", fontWeight: 900 }}>404</div>
        <div style={{ marginTop: "8px", fontSize: "20px", fontWeight: 800 }}>
          Halaman tidak ditemukan
        </div>
        <div style={{ marginTop: "10px", color: "#bdbdbd", lineHeight: 1.7 }}>
          Link yang kamu buka tidak tersedia atau sudah berubah.
        </div>
        <div style={{ marginTop: "18px" }}>
          <Link to="/" className="btn-primary" style={{ textDecoration: "none" }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

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
        path="/orders/:id"
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

      <Route
        path="/driver"
        element={
          <DriverRoute>
            <DriverDashboardPage />
          </DriverRoute>
        }
      />

      <Route
        path="/driver/orders"
        element={
          <DriverRoute>
            <DriverOrdersPage />
          </DriverRoute>
        }
      />

      <Route
        path="/driver/orders/:id"
        element={
          <DriverRoute>
            <DriverOrderDetailPage />
          </DriverRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}