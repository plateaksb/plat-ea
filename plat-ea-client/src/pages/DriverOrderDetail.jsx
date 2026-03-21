import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

function normalizePhoneToWa(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.slice(1)}`;
  } else if (cleaned.startsWith("8")) {
    cleaned = `62${cleaned}`;
  }

  return cleaned;
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

function DetailCard({ title, children }) {
  return (
    <div
      className="card-dark"
      style={{
        padding: "18px",
        display: "grid",
        gap: "12px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: 800 }}>{title}</div>
      {children}
    </div>
  );
}

export default function DriverOrderDetail() {
  const { id } = useParams();
  const { token } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchOrder() {
    const response = await fetch(buildApiUrl(`/driver/bookings/${id}`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal memuat detail order");
    }

    return result.data;
  }

  async function refreshData(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");
      const orderData = await fetchOrder();
      setOrder(orderData);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memuat detail order");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (token && id) {
      refreshData();
    }
  }, [token, id]);

  async function handleStart() {
    try {
      setActionLoading(true);
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
      await refreshData(true);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memulai order");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    try {
      setActionLoading(true);
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
      await refreshData(true);
    } catch (error) {
      setErrorMessage(error.message || "Gagal menyelesaikan order");
    } finally {
      setActionLoading(false);
    }
  }

  const whatsappUrl = useMemo(() => {
    const waNumber = normalizePhoneToWa(order?.user?.phone);
    if (!waNumber) return "";

    const message = [
      `Halo ${order?.user?.name || "Pelanggan"}, saya driver dari PLAT EA.`,
      `Saya menangani pesanan Anda dengan status ${order?.status || "-"}.`,
      "",
      `Pickup: ${order?.pickup || "-"}`,
      `Tujuan: ${order?.destination || "-"}`,
    ].join("\n");

    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  }, [order]);

  const mapsPickupUrl = useMemo(() => {
    if (!order?.pickup) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.pickup)}`;
  }, [order]);

  const mapsDestinationUrl = useMemo(() => {
    if (!order?.destination) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.destination)}`;
  }, [order]);

  if (loading) {
    return (
      <div className="card-dark" style={{ padding: "20px" }}>
        Memuat detail order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card-dark" style={{ padding: "20px" }}>
        Order tidak ditemukan.
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ fontSize: "24px", fontWeight: 900 }}>
              {order.serviceType} • {formatRupiah(order.finalPrice)}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={getStatusBadgeStyle(order.status)}>{order.status}</span>
              <span style={getScheduleBadgeStyle(order.isScheduled)}>
                {order.isScheduled ? "TERJADWAL" : "LANGSUNG"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={() => refreshData(true)}>
              {refreshing ? "Menyegarkan..." : "Refresh"}
            </button>

            <Link
              to="/driver/orders"
              className="btn-secondary"
              style={{ textDecoration: "none" }}
            >
              Kembali
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
        <DetailCard title="Ringkasan Order">
          <div style={{ color: "#bdbdbd" }}>
            ID Booking: <strong style={{ color: "#fff" }}>{order.id}</strong>
          </div>
          <div style={{ color: "#bdbdbd" }}>
            ETA: <strong style={{ color: "#fff" }}>{order.eta} menit</strong>
          </div>
          <div style={{ color: "#bdbdbd" }}>
            Jarak: <strong style={{ color: "#fff" }}>{order.distance} km</strong>
          </div>
          <div style={{ color: "#bdbdbd" }}>
            Dibuat:{" "}
            <strong style={{ color: "#fff" }}>{formatDateTime(order.createdAt)}</strong>
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
        </DetailCard>

        <DetailCard title="Pelanggan">
          <div style={{ color: "#bdbdbd" }}>
            Nama: <strong style={{ color: "#fff" }}>{order.user?.name || "-"}</strong>
          </div>
          <div style={{ color: "#bdbdbd" }}>
            Telepon: <strong style={{ color: "#fff" }}>{order.user?.phone || "-"}</strong>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ textDecoration: "none" }}
              >
                WhatsApp Pelanggan
              </a>
            )}
          </div>
        </DetailCard>
      </div>

      <DetailCard title="Rute Perjalanan">
        <div>
          <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Pickup</div>
          <div style={{ marginTop: "4px" }}>{order.pickup}</div>
        </div>

        <div>
          <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Tujuan</div>
          <div style={{ marginTop: "4px" }}>{order.destination}</div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {mapsPickupUrl && (
            <a
              href={mapsPickupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ textDecoration: "none" }}
            >
              Buka Pickup di Maps
            </a>
          )}

          {mapsDestinationUrl && (
            <a
              href={mapsDestinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ textDecoration: "none" }}
            >
              Buka Tujuan di Maps
            </a>
          )}
        </div>
      </DetailCard>

      <DetailCard title="Catatan & Pembayaran">
        <div style={{ color: "#bdbdbd" }}>
          Catatan: <strong style={{ color: "#fff" }}>{order.note || "-"}</strong>
        </div>
        <div style={{ color: "#bdbdbd" }}>
          Metode Pembayaran:{" "}
          <strong style={{ color: "#fff" }}>{order.paymentMethod || "-"}</strong>
        </div>
        <div style={{ color: "#bdbdbd" }}>
          Harga Final: <strong style={{ color: "#fff" }}>{formatRupiah(order.finalPrice)}</strong>
        </div>
      </DetailCard>

      <DetailCard title="Timeline Order">
        <div style={{ color: "#bdbdbd" }}>
          Assigned:{" "}
          <strong style={{ color: "#fff" }}>{formatDateTime(order.assignedAt)}</strong>
        </div>
        <div style={{ color: "#bdbdbd" }}>
          Started:{" "}
          <strong style={{ color: "#fff" }}>{formatDateTime(order.startedAt)}</strong>
        </div>
        <div style={{ color: "#bdbdbd" }}>
          Completed:{" "}
          <strong style={{ color: "#fff" }}>{formatDateTime(order.completedAt)}</strong>
        </div>
      </DetailCard>

      <div
        className="card-dark"
        style={{
          padding: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {order.status === "ASSIGNED" && (
          <button
            type="button"
            className="btn-primary"
            disabled={actionLoading}
            onClick={handleStart}
          >
            {actionLoading ? "Memulai..." : "Mulai Order"}
          </button>
        )}

        {order.status === "ONGOING" && (
          <button
            type="button"
            className="btn-primary"
            disabled={actionLoading}
            onClick={handleComplete}
          >
            {actionLoading ? "Menyimpan..." : "Selesaikan Order"}
          </button>
        )}

        <Link
          to="/driver/orders"
          className="btn-secondary"
          style={{ textDecoration: "none" }}
        >
          Kembali ke Daftar Order
        </Link>
      </div>
    </div>
  );
}