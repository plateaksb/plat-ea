import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusBadgeStyle(status) {
  const base = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  };

  switch (status) {
    case "ASSIGNED":
      return {
        ...base,
        backgroundColor: "rgba(59,130,246,0.16)",
        color: "#bfdbfe",
      };
    case "ONGOING":
      return {
        ...base,
        backgroundColor: "rgba(168,85,247,0.16)",
        color: "#d8b4fe",
      };
    case "COMPLETED":
      return {
        ...base,
        backgroundColor: "rgba(34,197,94,0.16)",
        color: "#bbf7d0",
      };
    case "CANCELLED":
      return {
        ...base,
        backgroundColor: "rgba(239,68,68,0.16)",
        color: "#fecaca",
      };
    default:
      return {
        ...base,
        backgroundColor: "rgba(255,255,255,0.08)",
        color: "#ffffff",
      };
  }
}

function StatCard({ label, value }) {
  return (
    <div
      className="card-dark"
      style={{
        padding: "18px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ color: "#9f9f9f", fontSize: "13px" }}>{label}</div>
      <div style={{ marginTop: "8px", fontSize: "28px", fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

function DriverOrderCard({
  order,
  actionLoadingId,
  onStart,
  onComplete,
}) {
  return (
    <div
      className="card-dark"
      style={{
        padding: "18px",
        display: "grid",
        gap: "14px",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "18px", fontWeight: 900 }}>
            {order.serviceType} • {formatRupiah(order.finalPrice)}
          </div>
          <div>
            <span style={getStatusBadgeStyle(order.status)}>{order.status}</span>
          </div>
          <div style={{ color: "#bdbdbd" }}>
            Pelanggan:{" "}
            <strong style={{ color: "#fff" }}>{order.user?.name || "-"}</strong>
          </div>
          <div style={{ color: "#bdbdbd" }}>
            Telepon:{" "}
            <strong style={{ color: "#fff" }}>{order.user?.phone || "-"}</strong>
          </div>
        </div>

        <div style={{ textAlign: "right", display: "grid", gap: "8px" }}>
          <div style={{ color: "#9f9f9f", fontSize: "13px" }}>ID Booking</div>
          <div style={{ fontWeight: 800, wordBreak: "break-word" }}>{order.id}</div>
          <div style={{ color: "#bdbdbd" }}>
            ETA: <strong style={{ color: "#fff" }}>{order.eta} menit</strong>
          </div>
          <div style={{ color: "#bdbdbd" }}>
            Jarak: <strong style={{ color: "#fff" }}>{order.distance} km</strong>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Pickup</div>
          <div>{order.pickup}</div>
        </div>

        <div>
          <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Tujuan</div>
          <div>{order.destination}</div>
        </div>

        <div style={{ color: "#bdbdbd" }}>
          Catatan: <strong style={{ color: "#fff" }}>{order.note || "-"}</strong>
        </div>

        <div style={{ color: "#bdbdbd" }}>
          Dibuat:{" "}
          <strong style={{ color: "#fff" }}>{formatDateTime(order.createdAt)}</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          to={`/driver/orders/${order.id}`}
          className="btn-secondary"
          style={{ textDecoration: "none" }}
        >
          Lihat Detail
        </Link>

        {order.status === "ASSIGNED" && (
          <button
            type="button"
            className="btn-primary"
            disabled={actionLoadingId === order.id}
            onClick={() => onStart(order.id)}
          >
            {actionLoadingId === order.id ? "Memulai..." : "Mulai Order"}
          </button>
        )}

        {order.status === "ONGOING" && (
          <button
            type="button"
            className="btn-primary"
            disabled={actionLoadingId === order.id}
            onClick={() => onComplete(order.id)}
          >
            {actionLoadingId === order.id ? "Menyimpan..." : "Selesaikan Order"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  const { token } = useAuth();

  const [driver, setDriver] = useState(null);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchProfile() {
    const response = await fetch(buildApiUrl("/driver/me"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal memuat profil driver");
    }

    return result.data;
  }

  async function fetchStats() {
    const response = await fetch(buildApiUrl("/driver/dashboard"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal memuat dashboard driver");
    }

    return result.data;
  }

  async function fetchActiveOrders() {
    const [assignedRes, ongoingRes] = await Promise.all([
      fetch(buildApiUrl("/driver/bookings?status=ASSIGNED"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch(buildApiUrl("/driver/bookings?status=ONGOING"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    const assignedJson = await assignedRes.json();
    const ongoingJson = await ongoingRes.json();

    if (!assignedRes.ok || !assignedJson.success) {
      throw new Error(assignedJson.message || "Gagal memuat order assigned");
    }

    if (!ongoingRes.ok || !ongoingJson.success) {
      throw new Error(ongoingJson.message || "Gagal memuat order ongoing");
    }

    return [...(ongoingJson.data || []), ...(assignedJson.data || [])];
  }

  async function refreshAll(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const [profileData, statsData, orderData] = await Promise.all([
        fetchProfile(),
        fetchStats(),
        fetchActiveOrders(),
      ]);

      setDriver(profileData);
      setStats(statsData);
      setOrders(orderData);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memuat dashboard driver");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
  if (token) {
    refreshAll();
  }
}, [token]);

  async function handleStartOrder(id) {
    try {
      setActionLoadingId(id);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(buildApiUrl(`/driver/bookings/${id}/start`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memulai order");
      }

      setSuccessMessage("Order berhasil dimulai.");
      await refreshAll(true);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memulai order");
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleCompleteOrder(id) {
    try {
      setActionLoadingId(id);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(buildApiUrl(`/driver/bookings/${id}/complete`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menyelesaikan order");
      }

      setSuccessMessage("Order berhasil diselesaikan.");
      await refreshAll(true);
    } catch (error) {
      setErrorMessage(error.message || "Gagal menyelesaikan order");
    } finally {
      setActionLoadingId("");
    }
  }

  const activeOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const rank = { ONGOING: 0, ASSIGNED: 1 };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    });
  }, [orders]);

  if (loading) {
    return (
      <div className="card-dark" style={{ padding: "20px" }}>
        Memuat dashboard driver...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <div
        className="card-dark"
        style={{
          padding: "20px",
          display: "grid",
          gap: "14px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 900 }}>
              Halo, {driver?.name || "Driver"}
            </div>
            <div style={{ color: "#bdbdbd", marginTop: "6px", lineHeight: 1.7 }}>
              Kendaraan: <strong style={{ color: "#fff" }}>{driver?.vehicleName || "-"}</strong>
              <br />
              Plat Nomor: <strong style={{ color: "#fff" }}>{driver?.plateNumber || "-"}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={() => refreshAll(true)}>
              {refreshing ? "Menyegarkan..." : "Refresh"}
            </button>
            <Link to="/driver/orders" className="btn-primary" style={{ textDecoration: "none" }}>
              Lihat Semua Order
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: "14px",
              borderRadius: "14px",
              backgroundColor: "rgba(255, 77, 77, 0.12)",
              border: "1px solid rgba(255, 77, 77, 0.35)",
              color: "#ffb3b3",
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
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.35)",
              color: "#bbf7d0",
            }}
          >
            {successMessage}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        <StatCard label="Tugas Baru" value={stats?.assigned ?? 0} />
        <StatCard label="Sedang Jalan" value={stats?.ongoing ?? 0} />
        <StatCard label="Selesai Hari Ini" value={stats?.completedToday ?? 0} />
        <StatCard label="Pendapatan Hari Ini" value={formatRupiah(stats?.todayRevenue ?? 0)} />
      </div>

      <div
        className="card-dark"
        style={{
          padding: "18px",
          display: "grid",
          gap: "14px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontSize: "22px", fontWeight: 900 }}>Order Aktif Saya</div>
        <div style={{ color: "#bdbdbd" }}>
          Menampilkan order yang sedang berjalan dan tugas baru yang sudah di-assign.
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <div className="card-dark" style={{ padding: "20px" }}>
          Belum ada order aktif saat ini.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {activeOrders.map((order) => (
            <DriverOrderCard
              key={order.id}
              order={order}
              actionLoadingId={actionLoadingId}
              onStart={handleStartOrder}
              onComplete={handleCompleteOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}