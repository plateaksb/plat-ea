import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

const bookingStatuses = [
  "PENDING",
  "ACCEPTED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
];

export default function AdminBookings() {
  const { token } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingBookingId, setUpdatingBookingId] = useState("");
  const [assigningDriverId, setAssigningDriverId] = useState("");
  const [bookingStatusDrafts, setBookingStatusDrafts] = useState({});
  const [driverAssignDrafts, setDriverAssignDrafts] = useState({});

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("SCHEDULE_NEAREST");

  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const tableRef = useRef(null);
  const syncingScrollRef = useRef(false);

  const thStyle = {
    textAlign: "left",
    padding: "14px 16px",
    fontSize: "13px",
    color: "#bdbdbd",
    fontWeight: 700,
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 3,
    backgroundColor: "#151515",
    boxShadow: "0 1px 0 rgba(255,255,255,0.06)",
  };

  const tdStyle = {
    padding: "14px 16px",
    verticalAlign: "top",
    fontSize: "14px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  };

  function paymentLabel(method) {
    return method === "TRANSFER" ? "Transfer" : "Tunai";
  }

  function bookingTypeLabel(isScheduled) {
    return isScheduled ? "Terjadwal" : "Sekarang";
  }

  function formatScheduledAt(value) {
    if (!value) return "Secepatnya";

    return new Date(value).toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });
  }

  function formatDateInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getEffectivePickupTime(booking) {
    return booking.scheduledAt || booking.createdAt;
  }

  function getStatusBadgeStyle(status) {
    const baseStyle = {
      display: "inline-block",
      padding: "6px 10px",
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

  function buildWhatsappMessage(booking) {
    const customerName = booking.user?.name || "Pelanggan";
    const customerPhone = booking.user?.phone || "-";
    const routeText = `${booking.pickup} → ${booking.destination}`;
    const scheduleText = booking.isScheduled
      ? formatScheduledAt(booking.scheduledAt)
      : "Secepatnya";

    const driverBlock =
      booking.driverName ||
      booking.driverPhone ||
      booking.vehicleName ||
      booking.plateNumber
        ? [
            "",
            "Informasi Driver:",
            `Nama Driver: ${booking.driverName || "-"}`,
            `No. Driver: ${booking.driverPhone || "-"}`,
            `Kendaraan: ${booking.vehicleName || "-"}`,
            `Plat Nomor: ${booking.plateNumber || "-"}`,
          ]
        : ["", "Informasi Driver: belum ditentukan admin."];

    return [
      `Halo ${customerName}, pesanan Anda sedang kami konfirmasi.`,
      "",
      "Detail Pesanan:",
      `Nama Pemesan: ${customerName}`,
      `No. HP: ${customerPhone}`,
      `Rute: ${routeText}`,
      `Hari/Jam: ${scheduleText}`,
      `Status: ${booking.status}`,
      ...driverBlock,
      "",
      "Terima kasih telah menggunakan PLAT EA.",
    ].join("\n");
  }

  function openWhatsappConfirmation(booking) {
    const waNumber = normalizePhoneToWa(booking.user?.phone);

    if (!waNumber) {
      setErrorMessage("Nomor HP / WhatsApp pemesan tidak tersedia.");
      return;
    }

    const message = buildWhatsappMessage(booking);
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function syncScroll(source, target) {
    if (!source || !target) return;
    if (syncingScrollRef.current) return;

    syncingScrollRef.current = true;
    target.scrollLeft = source.scrollLeft;

    requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  }

  function handleTopScroll() {
    syncScroll(topScrollRef.current, bottomScrollRef.current);
  }

  function handleBottomScroll() {
    syncScroll(bottomScrollRef.current, topScrollRef.current);
  }

  async function fetchDrivers() {
    const response = await fetch(buildApiUrl("/admin/drivers"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Gagal mengambil data driver");
    }

    setDrivers(result.data);
  }

  async function fetchBookings() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(buildApiUrl("/bookings"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil data booking");
      }

      setBookings(result.data);

      const statusDrafts = {};
      const nextDriverAssignDrafts = {};

      for (const booking of result.data) {
        statusDrafts[booking.id] = booking.status;
        nextDriverAssignDrafts[booking.id] = booking.driverId || "";
      }

      setBookingStatusDrafts(statusDrafts);
      setDriverAssignDrafts(nextDriverAssignDrafts);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat booking");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    try {
      setErrorMessage("");
      await Promise.all([fetchBookings(), fetchDrivers()]);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memuat ulang data");
    }
  }

  useEffect(() => {
    if (token) {
      refreshAll();
    }
  }, [token]);

  useEffect(() => {
    const updateTopScrollerWidth = () => {
      if (!tableRef.current || !topScrollRef.current) return;
      const spacer = topScrollRef.current.firstChild;
      if (spacer) {
        spacer.style.width = `${tableRef.current.scrollWidth}px`;
      }
    };

    updateTopScrollerWidth();
    window.addEventListener("resize", updateTopScrollerWidth);
    return () => window.removeEventListener("resize", updateTopScrollerWidth);
  }, [bookings, drivers, statusFilter, dateFilter, typeFilter, searchTerm, sortBy]);

  function handleBookingStatusChange(bookingId, status) {
    setBookingStatusDrafts((prev) => ({
      ...prev,
      [bookingId]: status,
    }));
  }

  async function handleSaveBookingStatus(bookingId, forcedStatus) {
    try {
      setUpdatingBookingId(bookingId);
      setErrorMessage("");
      setSuccessMessage("");

      const status = forcedStatus || bookingStatusDrafts[bookingId];

      const response = await fetch(
        buildApiUrl(`/bookings/${bookingId}/status`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui status booking");
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status: result.data.status,
                updatedAt: result.data.updatedAt,
              }
            : booking
        )
      );

      setBookingStatusDrafts((prev) => ({
        ...prev,
        [bookingId]: result.data.status,
      }));

      setSuccessMessage(`Status booking ${bookingId} berhasil diperbarui.`);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat memperbarui status");
    } finally {
      setUpdatingBookingId("");
    }
  }

  function handleDriverAssignDraftChange(bookingId, value) {
    setDriverAssignDrafts((prev) => ({
      ...prev,
      [bookingId]: value,
    }));
  }

  async function handleAssignDriver(bookingId) {
    try {
      setAssigningDriverId(bookingId);
      setErrorMessage("");
      setSuccessMessage("");

      const driverId = driverAssignDrafts[bookingId] || null;

      const response = await fetch(
        buildApiUrl(`/bookings/${bookingId}/assign-driver`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ driverId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal assign driver");
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                driverId: result.data.driverId,
                driverName: result.data.driverName,
                driverPhone: result.data.driverPhone,
                vehicleName: result.data.vehicleName,
                plateNumber: result.data.plateNumber,
                updatedAt: result.data.updatedAt,
              }
            : booking
        )
      );

      setSuccessMessage(result.message || "Driver berhasil ditugaskan.");
    } catch (error) {
      setErrorMessage(error.message || "Gagal assign driver");
    } finally {
      setAssigningDriverId("");
    }
  }

  function handleResetFilters() {
    setStatusFilter("ALL");
    setDateFilter("");
    setTypeFilter("ALL");
    setSearchTerm("");
    setSortBy("SCHEDULE_NEAREST");
  }

  const filteredBookings = useMemo(() => {
    const filtered = bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : booking.status === statusFilter;

      const matchesType =
        typeFilter === "ALL"
          ? true
          : typeFilter === "SCHEDULED"
          ? booking.isScheduled
          : !booking.isScheduled;

      const bookingDateValue = booking.isScheduled
        ? formatDateInputValue(booking.scheduledAt)
        : formatDateInputValue(booking.createdAt);

      const matchesDate = dateFilter ? bookingDateValue === dateFilter : true;

      const keyword = searchTerm.trim().toLowerCase();
      const haystack = [
        booking.id,
        booking.user?.name,
        booking.user?.email,
        booking.user?.phone,
        booking.pickup,
        booking.destination,
        booking.note,
        booking.cancelReason,
        booking.serviceType,
        booking.vehicleType,
        booking.driverName,
        booking.driverPhone,
        booking.vehicleName,
        booking.plateNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? haystack.includes(keyword) : true;

      return matchesStatus && matchesType && matchesDate && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const aSchedule = new Date(getEffectivePickupTime(a)).getTime();
      const bSchedule = new Date(getEffectivePickupTime(b)).getTime();
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      const aPrice = Number(a.finalPrice || 0);
      const bPrice = Number(b.finalPrice || 0);

      switch (sortBy) {
        case "NEWEST":
          return bCreated - aCreated;
        case "OLDEST":
          return aCreated - bCreated;
        case "PRICE_HIGH":
          return bPrice - aPrice;
        case "PRICE_LOW":
          return aPrice - bPrice;
        case "SCHEDULE_FARTHEST":
          return bSchedule - aSchedule;
        case "SCHEDULE_NEAREST":
        default:
          return aSchedule - bSchedule;
      }
    });
  }, [bookings, statusFilter, typeFilter, dateFilter, searchTerm, sortBy]);

  function renderQuickActions(booking) {
    const isUpdating = updatingBookingId === booking.id;

    const baseBtnStyle = {
      padding: "8px 10px",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "#ffffff",
      fontSize: "12px",
      fontWeight: 700,
      cursor: isUpdating ? "not-allowed" : "pointer",
      opacity: isUpdating ? 0.6 : 1,
    };

    if (booking.status === "PENDING") {
      return (
        <>
          <button
            type="button"
            style={baseBtnStyle}
            disabled={isUpdating}
            onClick={() => handleSaveBookingStatus(booking.id, "ACCEPTED")}
          >
            Terima
          </button>
          <button
            type="button"
            style={baseBtnStyle}
            disabled={isUpdating}
            onClick={() => handleSaveBookingStatus(booking.id, "CANCELLED")}
          >
            Batalkan
          </button>
        </>
      );
    }

    if (booking.status === "ACCEPTED") {
      return (
        <>
          <button
            type="button"
            style={baseBtnStyle}
            disabled={isUpdating}
            onClick={() => handleSaveBookingStatus(booking.id, "ONGOING")}
          >
            Mulai
          </button>
          <button
            type="button"
            style={baseBtnStyle}
            disabled={isUpdating}
            onClick={() => handleSaveBookingStatus(booking.id, "CANCELLED")}
          >
            Batalkan
          </button>
        </>
      );
    }

    if (booking.status === "ONGOING") {
      return (
        <>
          <button
            type="button"
            style={baseBtnStyle}
            disabled={isUpdating}
            onClick={() => handleSaveBookingStatus(booking.id, "COMPLETED")}
          >
            Selesaikan
          </button>
          <button
            type="button"
            style={baseBtnStyle}
            disabled={isUpdating}
            onClick={() => handleSaveBookingStatus(booking.id, "CANCELLED")}
          >
            Batalkan
          </button>
        </>
      );
    }

    return (
      <span style={{ fontSize: "12px", color: "#9f9f9f" }}>
        Tidak ada aksi cepat
      </span>
    );
  }

  if (loading) {
    return (
      <div className="card-dark" style={{ padding: "20px" }}>
        Memuat booking...
      </div>
    );
  }

  return (
    <section style={{ minWidth: 0 }}>
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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ margin: 0 }}>Daftar Booking Masuk</h2>

        <button type="button" className="btn-secondary" onClick={refreshAll}>
          Refresh Data
        </button>
      </div>

      <div
        className="card-dark"
        style={{
          padding: "18px",
          marginBottom: "18px",
          display: "grid",
          gap: "14px",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
          Filter & Urutkan Booking
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                color: "#cfcfcf",
              }}
            >
              Status
            </label>
            <select
              className="select-dark"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              {bookingStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                color: "#cfcfcf",
              }}
            >
              Jenis Booking
            </label>
            <select
              className="select-dark"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">Semua Jenis</option>
              <option value="SCHEDULED">Terjadwal</option>
              <option value="INSTANT">Sekarang</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                color: "#cfcfcf",
              }}
            >
              Tanggal
            </label>
            <input
              type="date"
              className="input-dark"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                color: "#cfcfcf",
              }}
            >
              Cari
            </label>
            <input
              type="text"
              className="input-dark"
              placeholder="Nama, HP, driver, plat, lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                color: "#cfcfcf",
              }}
            >
              Urutkan
            </label>
            <select
              className="select-dark"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="SCHEDULE_NEAREST">Jadwal Pickup Terdekat</option>
              <option value="SCHEDULE_FARTHEST">Jadwal Pickup Terjauh</option>
              <option value="NEWEST">Booking Terbaru</option>
              <option value="OLDEST">Booking Terlama</option>
              <option value="PRICE_HIGH">Harga Tertinggi</option>
              <option value="PRICE_LOW">Harga Terendah</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ color: "#bdbdbd", fontSize: "14px" }}>
            Menampilkan <strong>{filteredBookings.length}</strong> dari{" "}
            <strong>{bookings.length}</strong> booking
          </div>

          <button type="button" className="btn-secondary" onClick={handleResetFilters}>
            Reset Filter
          </button>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="card-dark" style={{ padding: "20px" }}>
          Tidak ada booking yang cocok dengan filter.
        </div>
      ) : (
        <>
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            style={{
              overflowX: "auto",
              overflowY: "hidden",
              marginBottom: "8px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.03)",
              height: "18px",
            }}
          >
            <div style={{ height: "1px", width: "3200px" }} />
          </div>

          <div
            ref={bottomScrollRef}
            onScroll={handleBottomScroll}
            className="card-dark"
            style={{
              padding: 0,
              overflowX: "auto",
              overflowY: "auto",
              borderRadius: "20px",
              maxHeight: "70vh",
              width: "100%",
              maxWidth: "100%",

            }}
          >
            <table
              ref={tableRef}
              style={{
                width: "100%",
                minWidth: "2800px",
                borderCollapse: "separate",
                borderSpacing: 0,
                color: "#ffffff",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...thStyle, minWidth: "280px" }}>ID</th>
                  <th style={{ ...thStyle, minWidth: "160px" }}>Pemesan</th>
                  <th style={{ ...thStyle, minWidth: "160px" }}>No. HP / WA</th>
                  <th style={{ ...thStyle, minWidth: "140px" }}>Layanan</th>
                  <th style={{ ...thStyle, minWidth: "280px" }}>Jemput</th>
                  <th style={{ ...thStyle, minWidth: "280px" }}>Tujuan</th>
                  <th style={{ ...thStyle, minWidth: "130px" }}>Jarak</th>
                  <th style={{ ...thStyle, minWidth: "160px" }}>Harga</th>
                  <th style={{ ...thStyle, minWidth: "150px" }}>Pembayaran</th>
                  <th style={{ ...thStyle, minWidth: "150px" }}>Jenis Booking</th>
                  <th style={{ ...thStyle, minWidth: "240px" }}>Jadwal Pickup</th>
                  <th style={{ ...thStyle, minWidth: "160px" }}>Driver</th>
                  <th style={{ ...thStyle, minWidth: "160px" }}>No. Driver</th>
                  <th style={{ ...thStyle, minWidth: "160px" }}>Kendaraan</th>
                  <th style={{ ...thStyle, minWidth: "150px" }}>Plat Nomor</th>
                  <th style={{ ...thStyle, minWidth: "300px" }}>Assign Driver</th>
                  <th style={{ ...thStyle, minWidth: "260px" }}>Catatan</th>
                  <th style={{ ...thStyle, minWidth: "260px" }}>Alasan Batal</th>
                  <th style={{ ...thStyle, minWidth: "140px" }}>Status</th>
                  <th style={{ ...thStyle, minWidth: "180px" }}>Konfirmasi WA</th>
                  <th style={{ ...thStyle, minWidth: "220px" }}>Aksi Cepat</th>
                  <th style={{ ...thStyle, minWidth: "220px" }}>Ubah Status</th>
                  <th style={{ ...thStyle, minWidth: "180px" }}>Dibuat</th>
                  <th style={{ ...thStyle, minWidth: "180px" }}>Diperbarui</th>
                </tr>
              </thead>

              <tbody>
                {filteredBookings.map((booking) => {
                  const isUpdating = updatingBookingId === booking.id;
                  const isAssigningDriver = assigningDriverId === booking.id;
                  const hasPhone = Boolean(normalizePhoneToWa(booking.user?.phone));

                  return (
                    <tr key={booking.id}>
                      <td style={tdStyle}>
                        <div style={{ maxWidth: "140px", wordBreak: "break-word" }}>
                          {booking.id}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>
                          {booking.user?.name || "Guest / belum login"}
                        </div>
                        <div
                          style={{
                            color: "#9f9f9f",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          {booking.user?.email || "-"}
                        </div>
                      </td>

                      <td style={tdStyle}>{booking.user?.phone || "-"}</td>

                      <td style={tdStyle}>
                        <div>{booking.serviceType}</div>
                        <div
                          style={{
                            color: "#9f9f9f",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          {booking.vehicleType || "-"}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ maxWidth: "280px", wordBreak: "break-word" }}>
                          {booking.pickup}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ maxWidth: "280px", wordBreak: "break-word" }}>
                          {booking.destination}
                        </div>
                      </td>

                      <td style={tdStyle}>{booking.distance} km</td>

                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(booking.finalPrice)}
                        </div>
                      </td>

                      <td style={tdStyle}>{paymentLabel(booking.paymentMethod)}</td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: "999px",
                            backgroundColor: booking.isScheduled
                              ? "rgba(59,130,246,0.16)"
                              : "rgba(255,255,255,0.08)",
                            color: booking.isScheduled ? "#bfdbfe" : "#ffffff",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {bookingTypeLabel(booking.isScheduled)}
                        </span>
                      </td>

                      <td style={tdStyle}>{formatScheduledAt(booking.scheduledAt)}</td>
                      <td style={tdStyle}>{booking.driverName || "-"}</td>
                      <td style={tdStyle}>{booking.driverPhone || "-"}</td>
                      <td style={tdStyle}>{booking.vehicleName || "-"}</td>
                      <td style={tdStyle}>{booking.plateNumber || "-"}</td>

                      <td style={{ ...tdStyle, minWidth: "300px" }}>
                        <div style={{ display: "grid", gap: "8px" }}>
                          <select
                            className="select-dark"
                            value={driverAssignDrafts[booking.id] || ""}
                            onChange={(e) =>
                              handleDriverAssignDraftChange(booking.id, e.target.value)
                            }
                          >
                            <option value="">-- Lepas driver --</option>
                            {drivers.map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name} - {driver.vehicleName} - {driver.plateNumber}
                                {driver.isActive ? "" : " (Nonaktif)"}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleAssignDriver(booking.id)}
                            disabled={isAssigningDriver}
                            style={{ width: "100%", opacity: isAssigningDriver ? 0.7 : 1 }}
                          >
                            {isAssigningDriver ? "Menyimpan Driver..." : "Simpan Driver"}
                          </button>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ maxWidth: "260px", wordBreak: "break-word" }}>
                          {booking.note || "-"}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ maxWidth: "260px", wordBreak: "break-word" }}>
                          {booking.cancelReason || "-"}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span style={getStatusBadgeStyle(booking.status)}>
                          {booking.status}
                        </span>
                      </td>

                      <td style={{ ...tdStyle, minWidth: "180px" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => openWhatsappConfirmation(booking)}
                          disabled={!hasPhone}
                          style={{ width: "100%", opacity: hasPhone ? 1 : 0.5 }}
                        >
                          Konfirmasi WA
                        </button>
                      </td>

                      <td style={{ ...tdStyle, minWidth: "220px" }}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {renderQuickActions(booking)}
                        </div>
                      </td>

                      <td style={{ ...tdStyle, minWidth: "220px" }}>
                        <div style={{ display: "grid", gap: "10px", minWidth: "200px" }}>
                          <select
                            className="select-dark"
                            value={bookingStatusDrafts[booking.id] || booking.status}
                            onChange={(e) =>
                              handleBookingStatusChange(booking.id, e.target.value)
                            }
                          >
                            {bookingStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleSaveBookingStatus(booking.id)}
                            disabled={isUpdating}
                            style={{ width: "100%", opacity: isUpdating ? 0.7 : 1 }}
                          >
                            {isUpdating ? "Menyimpan..." : "Simpan Status"}
                          </button>
                        </div>
                      </td>

                      <td style={tdStyle}>{formatDateTime(booking.createdAt)}</td>
                      <td style={tdStyle}>{formatDateTime(booking.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}