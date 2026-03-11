import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

const AUTO_REFRESH_MS = 8000;

export default function OrderDetail() {
  const { id } = useParams();
  const { token } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
      padding: "10px 14px",
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

  function getTimelineSteps(status) {
    const isCancelled = status === "CANCELLED";
    const normalSteps = [
      {
        key: "PENDING",
        title: "Pesanan Dibuat",
        desc: "Pesanan kamu sudah masuk ke sistem dan menunggu diproses admin.",
      },
      {
        key: "ACCEPTED",
        title: "Pesanan Diterima",
        desc: "Admin sudah menerima pesanan dan mulai menyiapkan armada/driver.",
      },
      {
        key: "ONGOING",
        title: "Driver Menuju / Order Berjalan",
        desc: "Driver sedang menangani pesanan kamu atau perjalanan sedang berlangsung.",
      },
      {
        key: "COMPLETED",
        title: "Pesanan Selesai",
        desc: "Pesanan telah selesai diproses. Terima kasih telah menggunakan PLAT EA.",
      },
    ];

    if (isCancelled) {
      return [
        {
          key: "PENDING",
          title: "Pesanan Dibuat",
          desc: "Pesanan sempat masuk ke sistem.",
          state: "done",
        },
        {
          key: "CANCELLED",
          title: "Pesanan Dibatalkan",
          desc: "Pesanan dibatalkan oleh user atau admin.",
          state: "cancelled",
        },
      ];
    }

    const statusOrder = ["PENDING", "ACCEPTED", "ONGOING", "COMPLETED"];
    const currentIndex = statusOrder.indexOf(status);

    return normalSteps.map((step, index) => ({
      ...step,
      state:
        index < currentIndex
          ? "done"
          : index === currentIndex
          ? "current"
          : "upcoming",
    }));
  }

  const timelineSteps = useMemo(
    () => getTimelineSteps(booking?.status),
    [booking?.status]
  );

  async function fetchBookingDetail(showMainLoader = false) {
    try {
      if (showMainLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage("");

      const response = await fetch(buildApiUrl(`/my-bookings/${id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil detail booking");
      }

      setBooking(result.data);
      setLastUpdated(new Date());
    } catch (error) {
      setErrorMessage(
        error.message || "Terjadi kesalahan saat mengambil detail booking"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (token && id) {
      fetchBookingDetail(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  useEffect(() => {
    if (!token || !id) return;

    const interval = setInterval(() => {
      fetchBookingDetail(false);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

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
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "28px",
            }}
          >
            <div>
              <h1 style={{ margin: "0 0 10px", fontSize: "40px" }}>
                Detail Order
              </h1>
              <p
                style={{
                  margin: 0,
                  color: "#bbbbbb",
                  lineHeight: 1.7,
                  maxWidth: "760px",
                }}
              >
                Pantau status order dan informasi driver secara detail.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fetchBookingDetail(false)}
                disabled={refreshing}
              >
                {refreshing ? "Memperbarui..." : "Refresh"}
              </button>

              <Link to="/history" className="btn-secondary">
                Kembali ke Riwayat
              </Link>
            </div>
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

          {loading && (
            <div className="card-dark" style={{ padding: "20px" }}>
              Memuat detail order...
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

          {!loading && booking && (
            <div style={{ display: "grid", gap: "18px" }}>
              <div
                className="card-dark"
                style={{
                  padding: "22px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "26px", fontWeight: 800 }}>
                    {booking.serviceType}
                    {booking.vehicleType ? ` - ${booking.vehicleType}` : ""}
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
                      padding: "10px 14px",
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
                className="card-dark"
                style={{
                  padding: "20px",
                  display: "grid",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: 800 }}>
                  Timeline Status
                </div>

                <div style={{ display: "grid", gap: "14px" }}>
                  {timelineSteps.map((step, index) => {
                    const state = step.state || "current";

                    const dotColor =
                      state === "cancelled"
                        ? "#ef4444"
                        : state === "done"
                        ? "#22c55e"
                        : state === "current"
                        ? "#ffffff"
                        : "rgba(255,255,255,0.25)";

                    const lineColor =
                      state === "done"
                        ? "rgba(34,197,94,0.55)"
                        : "rgba(255,255,255,0.10)";

                    return (
                      <div
                        key={step.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "32px 1fr",
                          gap: "14px",
                          alignItems: "start",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minHeight: "100%",
                          }}
                        >
                          <div
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "999px",
                              backgroundColor: dotColor,
                              boxShadow:
                                state === "current"
                                  ? "0 0 0 4px rgba(255,255,255,0.08)"
                                  : "none",
                              marginTop: "4px",
                              flexShrink: 0,
                            }}
                          />
                          {index < timelineSteps.length - 1 && (
                            <div
                              style={{
                                width: "2px",
                                flex: 1,
                                minHeight: "34px",
                                backgroundColor: lineColor,
                                marginTop: "8px",
                              }}
                            />
                          )}
                        </div>

                        <div
                          style={{
                            paddingBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: 800,
                              color:
                                state === "upcoming" ? "#9f9f9f" : "#ffffff",
                            }}
                          >
                            {step.title}
                          </div>
                          <div
                            style={{
                              marginTop: "4px",
                              color:
                                state === "upcoming" ? "#8b8b8b" : "#cfcfcf",
                              fontSize: "14px",
                              lineHeight: 1.7,
                            }}
                          >
                            {step.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {booking.status === "CANCELLED" && booking.cancelReason && (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "14px",
                      backgroundColor: "rgba(239,68,68,0.10)",
                      border: "1px solid rgba(239,68,68,0.20)",
                      color: "#fecaca",
                      fontSize: "14px",
                    }}
                  >
                    Alasan pembatalan: {booking.cancelReason}
                  </div>
                )}
              </div>

              <div className="duo-grid">
                <div
                  className="card-dark"
                  style={{
                    padding: "18px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                    Titik Jemput
                  </div>
                  <div style={{ marginTop: "8px", fontWeight: 700 }}>
                    {booking.pickup}
                  </div>
                </div>

                <div
                  className="card-dark"
                  style={{
                    padding: "18px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                    Tujuan
                  </div>
                  <div style={{ marginTop: "8px", fontWeight: 700 }}>
                    {booking.destination}
                  </div>
                </div>
              </div>

              <div className="duo-grid">
                <div
                  className="card-dark"
                  style={{
                    padding: "18px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                    Jarak
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "24px",
                      fontWeight: 900,
                    }}
                  >
                    {booking.distance} km
                  </div>
                </div>

                <div
                  className="card-dark"
                  style={{
                    padding: "18px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                    Estimasi Jemput
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "24px",
                      fontWeight: 900,
                    }}
                  >
                    {booking.eta} menit
                  </div>
                </div>
              </div>

              <div
                className="card-dark"
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
                    fontSize: "34px",
                    fontWeight: 900,
                  }}
                >
                  {formatRupiah(booking.finalPrice)}
                </div>
              </div>

              <div
                className="card-dark"
                style={{
                  padding: "18px",
                  display: "grid",
                  gap: "12px",
                }}
              >
                <div style={{ fontWeight: 800 }}>Informasi Order</div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    color: "#d1d5db",
                    fontSize: "14px",
                    lineHeight: 1.7,
                  }}
                >
                  <div>
                    <div style={{ color: "#9f9f9f", fontSize: "12px" }}>
                      Status Sekarang
                    </div>
                    <div style={{ fontWeight: 700 }}>{booking.status}</div>
                  </div>

                  <div>
                    <div style={{ color: "#9f9f9f", fontSize: "12px" }}>
                      Jadwal Penjemputan
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {formatScheduledAt(booking.scheduledAt)}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#9f9f9f", fontSize: "12px" }}>
                      Pembayaran
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {paymentLabel(booking.paymentMethod)}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#9f9f9f", fontSize: "12px" }}>
                      Dibuat
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {formatDateTime(booking.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="card-dark"
                style={{
                  padding: "18px",
                  display: "grid",
                  gap: "12px",
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
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
                      onClick={() => openDriverWhatsapp(booking.driverPhone)}
                    >
                      Hubungi Driver via WhatsApp
                    </button>
                  </div>
                )}
              </div>

              <div
                className="card-dark"
                style={{
                  padding: "18px",
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
                Catatan: {booking.note || "-"}
                <br />
                Alasan Batal: {booking.cancelReason || "-"}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}