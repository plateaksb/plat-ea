import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

const AUTO_REFRESH_MS = 10000;
const cancelReasonOptions = [
  "Salah pilih lokasi",
  "Ingin ubah layanan",
  "Harga tidak sesuai",
  "Driver terlalu lama",
  "Pesanan tidak jadi",
  "Alasan lainnya",
];

export default function History() {
  const { token, user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [cancelDrafts, setCancelDrafts] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [lastUpdated, setLastUpdated] = useState(null);

  function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function paymentLabel(method) {
    return method === "TRANSFER" ? "Transfer" : "Tunai";
  }

  function formatScheduledAt(value) {
    if (!value) return "Secepatnya";

    return new Date(value).toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });
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

  function openDriverWhatsapp(phone) {
    const wa = normalizePhoneToWa(phone);

    if (!wa) {
      setErrorMessage("Nomor WhatsApp driver belum tersedia.");
      return;
    }

    window.open(`https://wa.me/${wa}`, "_blank", "noopener,noreferrer");
  }

  function getStatusBadgeStyle(status) {
    const baseStyle = {
      display: "inline-block",
      padding: "8px 12px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 700,
    };

    switch (status) {
      case "PENDING":
        return {
          ...baseStyle,
          backgroundColor: "rgba(234, 179, 8, 0.16)",
          color: "#fde68a",
        };
      case "ACCEPTED":
        return {
          ...baseStyle,
          backgroundColor: "rgba(59, 130, 246, 0.16)",
          color: "#bfdbfe",
        };
      case "ONGOING":
        return {
          ...baseStyle,
          backgroundColor: "rgba(168, 85, 247, 0.16)",
          color: "#d8b4fe",
        };
      case "COMPLETED":
        return {
          ...baseStyle,
          backgroundColor: "rgba(34, 197, 94, 0.16)",
          color: "#bbf7d0",
        };
      case "CANCELLED":
        return {
          ...baseStyle,
          backgroundColor: "rgba(239, 68, 68, 0.16)",
          color: "#fecaca",
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: "rgba(255,255,255,0.08)",
          color: "#ffffff",
        };
    }
  }

  function getMiniTimeline(status) {
    if (status === "CANCELLED") {
      return [
        { key: "PENDING", label: "Dibuat", state: "done" },
        { key: "CANCELLED", label: "Dibatalkan", state: "cancelled" },
      ];
    }

    const steps = [
      { key: "PENDING", label: "Dibuat" },
      { key: "ACCEPTED", label: "Diterima" },
      { key: "ONGOING", label: "Berjalan" },
      { key: "COMPLETED", label: "Selesai" },
    ];

    const order = ["PENDING", "ACCEPTED", "ONGOING", "COMPLETED"];
    const currentIndex = order.indexOf(status);

    return steps.map((step, index) => ({
      ...step,
      state:
        index < currentIndex
          ? "done"
          : index === currentIndex
          ? "current"
          : "upcoming",
    }));
  }

  function getEffectiveScheduleTime(booking) {
    return booking.scheduledAt || booking.createdAt;
  }

  async function fetchMyBookings(showMainLoader = false) {
    try {
      if (showMainLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage("");

      const response = await fetch(buildApiUrl("/my-bookings"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil riwayat booking");
      }

      setBookings(result.data);

      const drafts = {};
      for (const booking of result.data) {
        drafts[booking.id] =
          cancelDrafts[booking.id] || cancelReasonOptions[0];
      }
      setCancelDrafts(drafts);
      setLastUpdated(new Date());
    } catch (error) {
      setErrorMessage(
        error.message || "Terjadi kesalahan saat mengambil riwayat booking"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (token) {
      fetchMyBookings(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetchMyBookings(false);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleCancelReasonChange(bookingId, value) {
    setCancelDrafts((prev) => ({
      ...prev,
      [bookingId]: value,
    }));
  }

  async function handleCancelBooking(bookingId) {
    try {
      setCancellingId(bookingId);
      setErrorMessage("");
      setSuccessMessage("");

      const cancelReason = cancelDrafts[bookingId];

      const response = await fetch(
        buildApiUrl(`/my-bookings/${bookingId}/cancel`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ cancelReason }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal membatalkan booking");
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status: result.data.status,
                cancelReason: result.data.cancelReason,
                updatedAt: result.data.updatedAt,
              }
            : booking
        )
      );

      setSuccessMessage("Booking berhasil dibatalkan.");
      setLastUpdated(new Date());
    } catch (error) {
      setErrorMessage(
        error.message || "Terjadi kesalahan saat membatalkan booking"
      );
    } finally {
      setCancellingId("");
    }
  }

  const filteredBookings = useMemo(() => {
    let result = bookings;

    if (statusFilter === "ACTIVE") {
      result = result.filter((booking) =>
        ["PENDING", "ACCEPTED", "ONGOING"].includes(booking.status)
      );
    } else if (statusFilter === "COMPLETED") {
      result = result.filter((booking) => booking.status === "COMPLETED");
    } else if (statusFilter === "CANCELLED") {
      result = result.filter((booking) => booking.status === "CANCELLED");
    }

    const keyword = searchTerm.trim().toLowerCase();

    if (keyword) {
      result = result.filter((booking) => {
        const haystack = [
          booking.id,
          booking.status,
          booking.pickup,
          booking.destination,
          booking.driverName,
          booking.driverPhone,
          booking.vehicleName,
          booking.plateNumber,
          booking.note,
          booking.cancelReason,
          booking.serviceType,
          booking.vehicleType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(keyword);
      });
    }

    const sorted = [...result].sort((a, b) => {
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      const aPrice = Number(a.finalPrice || 0);
      const bPrice = Number(b.finalPrice || 0);
      const aSchedule = new Date(getEffectiveScheduleTime(a)).getTime();
      const bSchedule = new Date(getEffectiveScheduleTime(b)).getTime();

      switch (sortBy) {
        case "OLDEST":
          return aCreated - bCreated;
        case "PRICE_HIGH":
          return bPrice - aPrice;
        case "PRICE_LOW":
          return aPrice - bPrice;
        case "SCHEDULE_NEAREST":
          return aSchedule - bSchedule;
        case "SCHEDULE_FARTHEST":
          return bSchedule - aSchedule;
        case "NEWEST":
        default:
          return bCreated - aCreated;
      }
    });

    return sorted;
  }, [bookings, statusFilter, searchTerm, sortBy]);

  const bookingCount = bookings.length;

  return (
    <div className="page-shell">
      <Navbar />

      <main
        className="section-padding"
        style={{ paddingTop: 40, paddingBottom: 80 }}
      >
        <div className="container">
          <div
            style={{
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <h1 style={{ margin: "0 0 10px", fontSize: "40px" }}>
                Riwayat Booking
              </h1>
              <p
                style={{
                  margin: 0,
                  color: "#bbbbbb",
                  lineHeight: 1.7,
                  maxWidth: "760px",
                }}
              >
                Lihat seluruh riwayat pesanan yang terkait dengan akun{" "}
                <strong>{user?.name}</strong>. Total booking:{" "}
                <strong>{bookingCount}</strong>.
              </p>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => fetchMyBookings(false)}
              disabled={refreshing}
            >
              {refreshing ? "Memperbarui..." : "Refresh"}
            </button>
          </div>

          {lastUpdated && !loading && (
            <div
              style={{
                marginBottom: "16px",
                color: "#9f9f9f",
                fontSize: "13px",
              }}
            >
              Terakhir diperbarui: {formatDateTime(lastUpdated)}
            </div>
          )}

          <div
            className="card-dark"
            style={{
              padding: "18px",
              marginBottom: "20px",
              display: "grid",
              gap: "14px",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "15px" }}>
              Filter Riwayat
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={
                  statusFilter === "ALL" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => setStatusFilter("ALL")}
              >
                Semua
              </button>

              <button
                type="button"
                className={
                  statusFilter === "ACTIVE" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => setStatusFilter("ACTIVE")}
              >
                Aktif
              </button>

              <button
                type="button"
                className={
                  statusFilter === "COMPLETED" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => setStatusFilter("COMPLETED")}
              >
                Selesai
              </button>

              <button
                type="button"
                className={
                  statusFilter === "CANCELLED" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => setStatusFilter("CANCELLED")}
              >
                Dibatalkan
              </button>
            </div>

            <input
              type="text"
              className="input-dark"
              placeholder="Cari ID booking, pickup, tujuan, driver, plat nomor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="select-dark"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="NEWEST">Urutkan: Terbaru</option>
              <option value="OLDEST">Urutkan: Terlama</option>
              <option value="PRICE_HIGH">Urutkan: Harga Tertinggi</option>
              <option value="PRICE_LOW">Urutkan: Harga Terendah</option>
              <option value="SCHEDULE_NEAREST">Urutkan: Jadwal Terdekat</option>
              <option value="SCHEDULE_FARTHEST">Urutkan: Jadwal Terjauh</option>
            </select>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                color: "#9f9f9f",
                fontSize: "13px",
              }}
            >
              <div>
                Menampilkan <strong>{filteredBookings.length}</strong> booking
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setStatusFilter("ALL");
                  setSearchTerm("");
                  setSortBy("NEWEST");
                }}
              >
                Reset Filter
              </button>
            </div>
          </div>

          {loading && (
            <div className="card-dark" style={{ padding: "20px" }}>
              Memuat riwayat booking...
            </div>
          )}

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
                marginBottom: "20px",
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
                marginBottom: "20px",
              }}
            >
              {successMessage}
            </div>
          )}

          {!loading && !errorMessage && filteredBookings.length === 0 && (
            <div className="card-dark" style={{ padding: "20px" }}>
              Tidak ada booking yang cocok dengan filter atau pencarian ini.
            </div>
          )}

          {!loading && filteredBookings.length > 0 && (
            <div style={{ display: "grid", gap: "18px" }}>
              {filteredBookings.map((booking) => {
                const canCancel = ["PENDING", "ACCEPTED"].includes(
                  booking.status
                );
                const isCancelling = cancellingId === booking.id;
                const hasDriver =
                  booking.driverName ||
                  booking.driverPhone ||
                  booking.vehicleName ||
                  booking.plateNumber;
                const miniTimeline = getMiniTimeline(booking.status);

                return (
                  <div
                    key={booking.id}
                    className="card-dark"
                    style={{
                      padding: "22px",
                      display: "grid",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "22px", fontWeight: 800 }}>
                          {booking.serviceType}
                          {booking.vehicleType
                            ? ` - ${booking.vehicleType}`
                            : ""}
                        </div>
                        <div
                          style={{
                            marginTop: "6px",
                            color: "#9f9f9f",
                            fontSize: "13px",
                          }}
                        >
                          Booking ID: {booking.id}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "8px 12px",
                            borderRadius: "999px",
                            backgroundColor: booking.isScheduled
                              ? "rgba(59,130,246,0.16)"
                              : "rgba(255,255,255,0.08)",
                            color: booking.isScheduled ? "#bfdbfe" : "#ffffff",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {booking.isScheduled ? "Terjadwal" : "Sekarang"}
                        </span>

                        <span style={getStatusBadgeStyle(booking.status)}>
                          {booking.status}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "16px",
                        backgroundColor: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          marginBottom: "14px",
                        }}
                      >
                        Progress Pesanan
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${miniTimeline.length}, minmax(0, 1fr))`,
                          gap: "10px",
                        }}
                      >
                        {miniTimeline.map((step, index) => {
                          const isDone = step.state === "done";
                          const isCurrent = step.state === "current";
                          const isCancelled = step.state === "cancelled";

                          const dotColor = isCancelled
                            ? "#ef4444"
                            : isDone
                            ? "#22c55e"
                            : isCurrent
                            ? "#ffffff"
                            : "rgba(255,255,255,0.22)";

                          const textColor = isCancelled
                            ? "#fecaca"
                            : isDone || isCurrent
                            ? "#ffffff"
                            : "#8f8f8f";

                          return (
                            <div key={step.key} style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "999px",
                                    backgroundColor: dotColor,
                                    flexShrink: 0,
                                    boxShadow: isCurrent
                                      ? "0 0 0 4px rgba(255,255,255,0.08)"
                                      : "none",
                                  }}
                                />
                                <div
                                  style={{
                                    height: "2px",
                                    flex: 1,
                                    backgroundColor:
                                      index < miniTimeline.length - 1
                                        ? isDone
                                          ? "rgba(34,197,94,0.55)"
                                          : "rgba(255,255,255,0.08)"
                                        : "transparent",
                                  }}
                                />
                              </div>

                              <div
                                style={{
                                  marginTop: "10px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  color: textColor,
                                }}
                              >
                                {step.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="duo-grid">
                      <div
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "16px",
                          padding: "16px",
                        }}
                      >
                        <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                          Titik Jemput
                        </div>
                        <div style={{ marginTop: "6px", fontWeight: 700 }}>
                          {booking.pickup}
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "16px",
                          padding: "16px",
                        }}
                      >
                        <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                          Tujuan
                        </div>
                        <div style={{ marginTop: "6px", fontWeight: 700 }}>
                          {booking.destination}
                        </div>
                      </div>
                    </div>

                    <div className="duo-grid">
                      <div
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          borderRadius: "16px",
                          padding: "16px",
                        }}
                      >
                        <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                          Jarak
                        </div>
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "22px",
                            fontWeight: 800,
                          }}
                        >
                          {booking.distance} km
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          borderRadius: "16px",
                          padding: "16px",
                        }}
                      >
                        <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                          Estimasi Jemput
                        </div>
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "22px",
                            fontWeight: 800,
                          }}
                        >
                          {booking.eta} menit
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "18px",
                        borderRadius: "18px",
                        backgroundColor: "#ffffff",
                        color: "#000000",
                      }}
                    >
                      <div style={{ fontSize: "13px", opacity: 0.7 }}>
                        Harga Final
                      </div>
                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "30px",
                          fontWeight: 900,
                        }}
                      >
                        {formatRupiah(booking.finalPrice)}
                      </div>
                    </div>

                    {hasDriver && (
                      <div
                        style={{
                          display: "grid",
                          gap: "12px",
                          padding: "16px",
                          borderRadius: "16px",
                          backgroundColor: "rgba(59,130,246,0.10)",
                          border: "1px solid rgba(59,130,246,0.25)",
                        }}
                      >
                        <div style={{ fontWeight: 800, color: "#dbeafe" }}>
                          Informasi Driver
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "12px",
                            color: "#d1d5db",
                            fontSize: "14px",
                            lineHeight: 1.7,
                          }}
                        >
                          <div>
                            <div style={{ color: "#9fb4c9", fontSize: "12px" }}>
                              Nama Driver
                            </div>
                            <div style={{ fontWeight: 700 }}>
                              {booking.driverName || "-"}
                            </div>
                          </div>

                          <div>
                            <div style={{ color: "#9fb4c9", fontSize: "12px" }}>
                              No. Driver
                            </div>
                            <div style={{ fontWeight: 700 }}>
                              {booking.driverPhone || "-"}
                            </div>
                          </div>

                          <div>
                            <div style={{ color: "#9fb4c9", fontSize: "12px" }}>
                              Kendaraan
                            </div>
                            <div style={{ fontWeight: 700 }}>
                              {booking.vehicleName || "-"}
                            </div>
                          </div>

                          <div>
                            <div style={{ color: "#9fb4c9", fontSize: "12px" }}>
                              Plat Nomor
                            </div>
                            <div style={{ fontWeight: 700 }}>
                              {booking.plateNumber || "-"}
                            </div>
                          </div>
                        </div>

                        {booking.driverPhone && (
                          <div>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() =>
                                openDriverWhatsapp(booking.driverPhone)
                              }
                            >
                              Hubungi Driver via WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        color: "#bdbdbd",
                        fontSize: "14px",
                        lineHeight: 1.8,
                      }}
                    >
                      Tarif Dasar: {formatRupiah(booking.baseFare)}
                      <br />
                      Tarif per Km: {formatRupiah(booking.perKm)}
                      <br />
                      Minimum Tarif: {formatRupiah(booking.minimumFare)}
                      <br />
                      Harga Awal: {formatRupiah(booking.calculatedPrice)}
                      <br />
                      Pembayaran: {paymentLabel(booking.paymentMethod)}
                      <br />
                      Jenis Booking:{" "}
                      {booking.isScheduled ? "Terjadwal" : "Sekarang"}
                      <br />
                      Jadwal Penjemputan: {formatScheduledAt(booking.scheduledAt)}
                      <br />
                      Catatan: {booking.note || "-"}
                      <br />
                      Alasan Batal: {booking.cancelReason || "-"}
                      <br />
                      Dibuat:{" "}
                      {booking.createdAt
                        ? new Date(booking.createdAt).toLocaleString("id-ID")
                        : "-"}
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Link to={`/history/${booking.id}`} className="btn-primary">
                        Lihat Detail Order
                      </Link>
                    </div>

                    {canCancel && (
                      <div
                        style={{
                          display: "grid",
                          gap: "12px",
                          padding: "16px",
                          borderRadius: "16px",
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>Batalkan Pesanan</div>

                        <select
                          className="select-dark"
                          value={cancelDrafts[booking.id] || cancelReasonOptions[0]}
                          onChange={(e) =>
                            handleCancelReasonChange(booking.id, e.target.value)
                          }
                        >
                          {cancelReasonOptions.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={isCancelling}
                          style={{ opacity: isCancelling ? 0.7 : 1 }}
                        >
                          {isCancelling ? "Membatalkan..." : "Batal Pesanan"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}