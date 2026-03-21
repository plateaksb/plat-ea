import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

const tabs = [
  { key: "ASSIGNED", label: "Tugas Baru" },
  { key: "ONGOING", label: "Sedang Jalan" },
  { key: "COMPLETED", label: "Selesai" },
];

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

function getScheduledAlertInfo(isScheduled, scheduledAt) {
  if (!isScheduled || !scheduledAt) return null;

  const targetTime = new Date(scheduledAt).getTime();
  if (Number.isNaN(targetTime)) return null;

  const diffMs = targetTime - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes > 60) {
    return {
      label: `Jemput ${diffMinutes} menit lagi`,
      style: {
        backgroundColor: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#e5e5e5",
      },
    };
  }

  if (diffMinutes > 30) {
    return {
      label: `Siaga • ${diffMinutes} menit lagi`,
      style: {
        backgroundColor: "rgba(234,179,8,0.14)",
        border: "1px solid rgba(234,179,8,0.28)",
        color: "#fde68a",
      },
    };
  }

  if (diffMinutes >= 0) {
    return {
      label: `Segera jemput • ${diffMinutes} menit lagi`,
      style: {
        backgroundColor: "rgba(249,115,22,0.16)",
        border: "1px solid rgba(249,115,22,0.30)",
        color: "#fdba74",
      },
    };
  }

  return {
    label: `Lewat jadwal • ${Math.abs(diffMinutes)} menit`,
    style: {
      backgroundColor: "rgba(239,68,68,0.16)",
      border: "1px solid rgba(239,68,68,0.30)",
      color: "#fecaca",
    },
  };
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

function getScheduleBadgeStyle(isScheduled) {
  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    backgroundColor: isScheduled
      ? "rgba(249,115,22,0.16)"
      : "rgba(255,255,255,0.08)",
    color: isScheduled ? "#fdba74" : "#d4d4d4",
  };
}

function MiniStat({ label, value }) {
  return (
    <div
      className="card-dark"
      style={{
        padding: "16px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ color: "#9f9f9f", fontSize: "13px" }}>{label}</div>
      <div style={{ marginTop: "8px", fontSize: "24px", fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

function DriverOrderCard({ order, actionLoadingId, onStart, onComplete }) {
  const scheduledAlert = getScheduledAlertInfo(order.isScheduled, order.scheduledAt);

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

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={getStatusBadgeStyle(order.status)}>{order.status}</span>
            <span style={getScheduleBadgeStyle(order.isScheduled)}>
              {order.isScheduled ? "TERJADWAL" : "LANGSUNG"}
            </span>
          </div>

          <div style={{ color: "#bdbdbd" }}>
            Pelanggan:{" "}
            <strong style={{ color: "#fff" }}>{order.user?.name || "-"}</strong>
          </div>

          <div style={{ color: "#bdbdbd" }}>
            Telepon:{" "}
            <strong style={{ color: "#fff" }}>{order.user?.phone || "-"}</strong>
          </div>

          <div style={{ color: "#bdbdbd" }}>
            Tipe Booking:{" "}
            <strong style={{ color: "#fff" }}>
              {order.isScheduled ? "Terjadwal" : "Langsung"}
            </strong>
          </div>

          {order.isScheduled && (
            <div style={{ color: "#bdbdbd" }}>
              Jadwal Jemput:{" "}
              <strong style={{ color: "#fff" }}>
                {formatDateTime(order.scheduledAt)}
              </strong>
            </div>
          )}

          {scheduledAlert && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "14px",
                fontSize: "13px",
                fontWeight: 700,
                ...scheduledAlert.style,
              }}
            >
              {scheduledAlert.label}
            </div>
          )}
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

export default function DriverOrders() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState("ASSIGNED");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  async function fetchOrders(status = activeTab) {
    const response = await fetch(buildApiUrl(`/driver/bookings?status=${status}`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal memuat order driver");
    }

    return result.data || [];
  }

  async function refreshData(showRefreshing = false, status = activeTab) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");
      const orderList = await fetchOrders(status);
      setOrders(orderList);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memuat order driver");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (token) {
      refreshData(false, activeTab);
    }
  }, [token, activeTab]);

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
      await refreshData(true, activeTab);
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
      await refreshData(true, activeTab);
    } catch (error) {
      setErrorMessage(error.message || "Gagal menyelesaikan order");
    } finally {
      setActionLoadingId("");
    }
  }

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    let list = [...orders];

    if (q) {
      list = list.filter((order) =>
        [
          order.id,
          order.pickup,
          order.destination,
          order.user?.name,
          order.user?.phone,
          order.serviceType,
          order.status,
          order.isScheduled ? "terjadwal" : "langsung",
          order.scheduledAt,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [orders, searchTerm]);

  const statAssigned = orders.filter((item) => item.status === "ASSIGNED").length;
  const statOngoing = orders.filter((item) => item.status === "ONGOING").length;
  const statCompleted = orders.filter((item) => item.status === "COMPLETED").length;

  if (loading) {
    return (
      <div className="card-dark" style={{ padding: "20px" }}>
        Memuat daftar order driver...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <div
        className="card-dark"
        style={{
          padding: "18px",
          display: "grid",
          gap: "14px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontSize: "22px", fontWeight: 900 }}>Daftar Order Driver</div>
        <div style={{ color: "#bdbdbd", lineHeight: 1.7 }}>
          Kelola tugas baru, order yang sedang berjalan, dan histori order selesai.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <MiniStat label="Tugas Baru" value={statAssigned} />
          <MiniStat label="Sedang Jalan" value={statOngoing} />
          <MiniStat label="Selesai" value={statCompleted} />
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={active ? "btn-primary" : "btn-secondary"}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 13,
                color: "#bdbdbd",
              }}
            >
              Cari Order
            </label>
            <input
              className="input-dark"
              type="text"
              placeholder="Cari nama pelanggan, pickup, tujuan, ID booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => refreshData(true, activeTab)}
          >
            {refreshing ? "Menyegarkan..." : "Refresh"}
          </button>
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

      {filteredOrders.length === 0 ? (
        <div className="card-dark" style={{ padding: "20px" }}>
          Belum ada order pada kategori ini.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {filteredOrders.map((order) => (
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