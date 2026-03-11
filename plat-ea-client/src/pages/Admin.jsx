import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = "http://localhost:5000/api";
const bookingStatuses = [
  "PENDING",
  "ACCEPTED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
];

export default function Admin() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState("DASHBOARD");

  const [pricing, setPricing] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [updatingBookingId, setUpdatingBookingId] = useState("");
  const [savingDriverId, setSavingDriverId] = useState("");
  const [bookingStatusDrafts, setBookingStatusDrafts] = useState({});
  const [driverDrafts, setDriverDrafts] = useState({});

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

  const driverInputStyle = {
    width: "100%",
    padding: "9px 10px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    fontSize: "13px",
    outline: "none",
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

  function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function getEffectivePickupTime(booking) {
    return booking.scheduledAt || booking.createdAt;
  }

  function isToday(value) {
    if (!value) return false;
    const d = new Date(value);
    const now = new Date();

    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
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

  async function fetchPricing() {
    const response = await fetch(`${API_BASE_URL}/pricing`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Gagal mengambil data tarif");
    }

    setPricing(result.data);
  }

  async function fetchBookings() {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
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
    const nextDriverDrafts = {};

    for (const booking of result.data) {
      statusDrafts[booking.id] = booking.status;
      nextDriverDrafts[booking.id] = {
        driverName: booking.driverName || "",
        driverPhone: booking.driverPhone || "",
        vehicleName: booking.vehicleName || "",
        plateNumber: booking.plateNumber || "",
      };
    }

    setBookingStatusDrafts(statusDrafts);
    setDriverDrafts(nextDriverDrafts);
  }

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");
      await Promise.all([fetchPricing(), fetchBookings()]);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadData();
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

    return () => {
      window.removeEventListener("resize", updateTopScrollerWidth);
    };
  }, [bookings, pricing, statusFilter, dateFilter, typeFilter, searchTerm, sortBy, activeTab]);

  function handleInputChange(section, key, field, value) {
    setPricing((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: {
          ...prev[section][key],
          [field]: field === "label" ? value : Number(value),
        },
      },
    }));
  }

  async function handleSave(section, key) {
    try {
      setSavingKey(`${section}-${key}`);
      setErrorMessage("");
      setSuccessMessage("");

      const values = pricing[section][key];

      const response = await fetch(`${API_BASE_URL}/pricing`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section,
          key,
          values,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menyimpan tarif");
      }

      setPricing(result.data);
      setSuccessMessage(`Tarif ${values.label} berhasil diperbarui.`);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat menyimpan tarif");
    } finally {
      setSavingKey("");
    }
  }

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
        `${API_BASE_URL}/bookings/${bookingId}/status`,
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
      setErrorMessage(
        error.message || "Terjadi kesalahan saat memperbarui status booking"
      );
    } finally {
      setUpdatingBookingId("");
    }
  }

  function handleDriverDraftChange(bookingId, field, value) {
    setDriverDrafts((prev) => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        [field]: value,
      },
    }));
  }

  async function handleSaveDriver(bookingId) {
    try {
      setSavingDriverId(bookingId);
      setErrorMessage("");
      setSuccessMessage("");

      const draft = driverDrafts[bookingId] || {
        driverName: "",
        driverPhone: "",
        vehicleName: "",
        plateNumber: "",
      };

      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/driver`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driverName: draft.driverName,
          driverPhone: draft.driverPhone,
          vehicleName: draft.vehicleName,
          plateNumber: draft.plateNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menyimpan data driver");
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                driverName: result.data.driverName,
                driverPhone: result.data.driverPhone,
                vehicleName: result.data.vehicleName,
                plateNumber: result.data.plateNumber,
                updatedAt: result.data.updatedAt,
              }
            : booking
        )
      );

      setDriverDrafts((prev) => ({
        ...prev,
        [bookingId]: {
          driverName: result.data.driverName || "",
          driverPhone: result.data.driverPhone || "",
          vehicleName: result.data.vehicleName || "",
          plateNumber: result.data.plateNumber || "",
        },
      }));

      setSuccessMessage(`Data driver booking ${bookingId} berhasil disimpan.`);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat menyimpan driver");
    } finally {
      setSavingDriverId("");
    }
  }

  function handleResetFilters() {
    setStatusFilter("ALL");
    setDateFilter("");
    setTypeFilter("ALL");
    setSearchTerm("");
    setSortBy("SCHEDULE_NEAREST");
  }

  const summary = useMemo(() => {
    const totalToday = bookings.filter((booking) =>
      isToday(booking.isScheduled ? booking.scheduledAt : booking.createdAt)
    ).length;

    const pendingCount = bookings.filter(
      (booking) => booking.status === "PENDING"
    ).length;

    const scheduledCount = bookings.filter(
      (booking) => booking.isScheduled
    ).length;

    const cancelledCount = bookings.filter(
      (booking) => booking.status === "CANCELLED"
    ).length;

    const completedCount = bookings.filter(
      (booking) => booking.status === "COMPLETED"
    ).length;

    return {
      totalToday,
      pendingCount,
      scheduledCount,
      cancelledCount,
      completedCount,
    };
  }, [bookings]);

  const analytics = useMemo(() => {
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter((booking) =>
      ["PENDING", "ACCEPTED", "ONGOING"].includes(booking.status)
    ).length;
    const completedBookings = bookings.filter(
      (booking) => booking.status === "COMPLETED"
    );
    const cancelledBookings = bookings.filter(
      (booking) => booking.status === "CANCELLED"
    ).length;

    const totalRevenue = completedBookings.reduce(
      (sum, booking) => sum + Number(booking.finalPrice || 0),
      0
    );

    const todayRevenue = completedBookings
      .filter((booking) => isToday(booking.updatedAt || booking.createdAt))
      .reduce((sum, booking) => sum + Number(booking.finalPrice || 0), 0);

    const serviceCountMap = bookings.reduce((acc, booking) => {
      const key = booking.serviceType || "LAINNYA";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const vehicleCountMap = bookings
      .filter((booking) => booking.vehicleType)
      .reduce((acc, booking) => {
        const key = booking.vehicleType || "LAINNYA";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    const topServiceEntry =
      Object.entries(serviceCountMap).sort((a, b) => b[1] - a[1])[0] || null;

    const topVehicleEntry =
      Object.entries(vehicleCountMap).sort((a, b) => b[1] - a[1])[0] || null;

    return {
      totalBookings,
      activeBookings,
      completedBookings: completedBookings.length,
      cancelledBookings,
      totalRevenue,
      todayRevenue,
      topService: topServiceEntry
        ? `${topServiceEntry[0]} (${topServiceEntry[1]})`
        : "-",
      topVehicle: topVehicleEntry
        ? `${topVehicleEntry[0]} (${topVehicleEntry[1]})`
        : "-",
    };
  }, [bookings]);

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

  function renderEditor(section, key, item) {
    const isSaving = savingKey === `${section}-${key}`;

    return (
      <div
        key={key}
        className="card-dark"
        style={{ padding: "20px", display: "grid", gap: "12px" }}
      >
        <div style={{ fontSize: "22px", fontWeight: 800 }}>{item.label}</div>

        <div style={{ display: "grid", gap: "10px" }}>
          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            Nama Layanan
            <input
              className="input-dark"
              value={item.label}
              onChange={(e) =>
                handleInputChange(section, key, "label", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>

          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            Tarif Dasar
            <input
              type="number"
              className="input-dark"
              value={item.baseFare}
              onChange={(e) =>
                handleInputChange(section, key, "baseFare", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>

          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            Tarif per Km
            <input
              type="number"
              className="input-dark"
              value={item.perKm}
              onChange={(e) =>
                handleInputChange(section, key, "perKm", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>

          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            Minimum Tarif
            <input
              type="number"
              className="input-dark"
              value={item.minimumFare}
              onChange={(e) =>
                handleInputChange(section, key, "minimumFare", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>

          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            ETA Dasar
            <input
              type="number"
              className="input-dark"
              value={item.etaBase}
              onChange={(e) =>
                handleInputChange(section, key, "etaBase", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>
        </div>

        <button
          className="btn-primary"
          onClick={() => handleSave(section, key)}
          disabled={isSaving}
          style={{ width: "100%", opacity: isSaving ? 0.7 : 1 }}
          type="button"
        >
          {isSaving ? "Menyimpan..." : "Simpan Tarif"}
        </button>
      </div>
    );
  }

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

  function renderTabButton(tabKey, label) {
    const isActive = activeTab === tabKey;

    return (
      <button
        type="button"
        onClick={() => setActiveTab(tabKey)}
        className={isActive ? "btn-primary" : "btn-secondary"}
      >
        {label}
      </button>
    );
  }

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
              Kelola operasional PLAT EA dengan tampilan yang dipisah antara
              dashboard analitik, booking masuk, dan pengaturan tarif.
            </p>
          </div>

          <div
            className="card-dark"
            style={{
              padding: "16px",
              marginBottom: "20px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {renderTabButton("DASHBOARD", "Dashboard")}
            {renderTabButton("BOOKINGS", "Booking Masuk")}
            {renderTabButton("PRICING", "Pengaturan Tarif")}
          </div>

          {loading && (
            <div className="card-dark" style={{ padding: "20px", color: "#cfcfcf" }}>
              Memuat data...
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

          {!loading && activeTab === "DASHBOARD" && (
            <>
              <section style={{ marginBottom: "18px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Booking Hari Ini
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
                      {summary.totalToday}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Booking Pending
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
                      {summary.pendingCount}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Booking Terjadwal
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
                      {summary.scheduledCount}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Booking Dibatalkan
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
                      {summary.cancelledCount}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Booking Selesai
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
                      {summary.completedCount}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Total Booking
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
                      {analytics.totalBookings}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Booking Aktif
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
                      {analytics.activeBookings}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Booking Selesai
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
                      {analytics.completedBookings}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Booking Dibatalkan
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
                      {analytics.cancelledBookings}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Omzet Selesai
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "24px", fontWeight: 900 }}>
                      {formatRupiah(analytics.totalRevenue)}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Omzet Hari Ini
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "24px", fontWeight: 900 }}>
                      {formatRupiah(analytics.todayRevenue)}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Layanan Terlaris
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "20px", fontWeight: 800 }}>
                      {analytics.topService}
                    </div>
                  </div>

                  <div className="card-dark" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
                      Kendaraan Taksi Terlaris
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "20px", fontWeight: 800 }}>
                      {analytics.topVehicle}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {!loading && activeTab === "PRICING" && pricing && (
            <>
              <section style={{ marginBottom: "40px" }}>
                <h2 style={{ marginBottom: "16px" }}>Edit Tarif Taksi</h2>
                <div className="grid-3">
                  {Object.entries(pricing.taxiTypes).map(([key, item]) =>
                    renderEditor("taxiTypes", key, item)
                  )}
                </div>
              </section>

              <section style={{ marginBottom: "40px" }}>
                <h2 style={{ marginBottom: "16px" }}>Edit Tarif Layanan Lain</h2>
                <div className="grid-2">
                  {Object.entries(pricing.services).map(([key, item]) =>
                    renderEditor("services", key, item)
                  )}
                </div>
              </section>
            </>
          )}

          {!loading && activeTab === "BOOKINGS" && (
            <section>
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

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={loadData}
                >
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
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
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
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#cfcfcf" }}>
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
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#cfcfcf" }}>
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
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#cfcfcf" }}>
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
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#cfcfcf" }}>
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
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#cfcfcf" }}>
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

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleResetFilters}
                  >
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
                    <div style={{ height: "1px", width: "4200px" }} />
                  </div>

                  <div
                    ref={bottomScrollRef}
                    onScroll={handleBottomScroll}
                    className="card-dark"
                    style={{
                      padding: 0,
                      overflow: "auto",
                      borderRadius: "20px",
                      maxHeight: "70vh",
                    }}
                  >
                    <table
                      ref={tableRef}
                      style={{
                        width: "100%",
                        minWidth: "4200px",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        color: "#ffffff",
                        fontSize: "14px",
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={thStyle}>ID</th>
                          <th style={thStyle}>Pemesan</th>
                          <th style={thStyle}>No. HP / WA</th>
                          <th style={thStyle}>Layanan</th>
                          <th style={thStyle}>Jemput</th>
                          <th style={thStyle}>Tujuan</th>
                          <th style={thStyle}>Jarak</th>
                          <th style={thStyle}>Harga</th>
                          <th style={thStyle}>Pembayaran</th>
                          <th style={thStyle}>Jenis Booking</th>
                          <th style={thStyle}>Jadwal Pickup</th>
                          <th style={thStyle}>Driver</th>
                          <th style={thStyle}>No. Driver</th>
                          <th style={thStyle}>Kendaraan</th>
                          <th style={thStyle}>Plat Nomor</th>
                          <th style={thStyle}>Atur Driver</th>
                          <th style={thStyle}>Catatan</th>
                          <th style={thStyle}>Alasan Batal</th>
                          <th style={thStyle}>Status</th>
                          <th style={{ ...thStyle, minWidth: "180px" }}>
                            Konfirmasi WA
                          </th>
                          <th style={{ ...thStyle, minWidth: "220px" }}>
                            Aksi Cepat
                          </th>
                          <th style={{ ...thStyle, minWidth: "220px" }}>
                            Ubah Status
                          </th>
                          <th style={thStyle}>Dibuat</th>
                          <th style={thStyle}>Diperbarui</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredBookings.map((booking) => {
                          const isUpdating = updatingBookingId === booking.id;
                          const isSavingDriver = savingDriverId === booking.id;
                          const hasPhone = Boolean(
                            normalizePhoneToWa(booking.user?.phone)
                          );

                          const driverDraft = driverDrafts[booking.id] || {
                            driverName: "",
                            driverPhone: "",
                            vehicleName: "",
                            plateNumber: "",
                          };

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
                                <div style={{ maxWidth: "220px", wordBreak: "break-word" }}>
                                  {booking.pickup}
                                </div>
                              </td>

                              <td style={tdStyle}>
                                <div style={{ maxWidth: "220px", wordBreak: "break-word" }}>
                                  {booking.destination}
                                </div>
                              </td>

                              <td style={tdStyle}>{booking.distance} km</td>

                              <td style={tdStyle}>
                                <div style={{ fontWeight: 700 }}>
                                  {formatRupiah(booking.finalPrice)}
                                </div>
                                <div
                                  style={{
                                    color: "#9f9f9f",
                                    fontSize: "12px",
                                    marginTop: "4px",
                                  }}
                                >
                                  Min: {formatRupiah(booking.minimumFare)}
                                </div>
                              </td>

                              <td style={tdStyle}>
                                {paymentLabel(booking.paymentMethod)}
                              </td>

                              <td style={tdStyle}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "6px 10px",
                                    borderRadius: "999px",
                                    backgroundColor: booking.isScheduled
                                      ? "rgba(59,130,246,0.16)"
                                      : "rgba(255,255,255,0.08)",
                                    color: booking.isScheduled
                                      ? "#bfdbfe"
                                      : "#ffffff",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                  }}
                                >
                                  {bookingTypeLabel(booking.isScheduled)}
                                </span>
                              </td>

                              <td style={tdStyle}>
                                <div style={{ maxWidth: "220px", wordBreak: "break-word" }}>
                                  {formatScheduledAt(booking.scheduledAt)}
                                </div>
                              </td>

                              <td style={tdStyle}>{booking.driverName || "-"}</td>
                              <td style={tdStyle}>{booking.driverPhone || "-"}</td>
                              <td style={tdStyle}>{booking.vehicleName || "-"}</td>
                              <td style={tdStyle}>{booking.plateNumber || "-"}</td>

                              <td style={{ ...tdStyle, minWidth: "260px" }}>
                                <div style={{ display: "grid", gap: "8px" }}>
                                  <input
                                    type="text"
                                    placeholder="Nama driver"
                                    value={driverDraft.driverName}
                                    onChange={(e) =>
                                      handleDriverDraftChange(
                                        booking.id,
                                        "driverName",
                                        e.target.value
                                      )
                                    }
                                    style={driverInputStyle}
                                  />

                                  <input
                                    type="text"
                                    placeholder="No. HP driver"
                                    value={driverDraft.driverPhone}
                                    onChange={(e) =>
                                      handleDriverDraftChange(
                                        booking.id,
                                        "driverPhone",
                                        e.target.value
                                      )
                                    }
                                    style={driverInputStyle}
                                  />

                                  <input
                                    type="text"
                                    placeholder="Nama kendaraan"
                                    value={driverDraft.vehicleName}
                                    onChange={(e) =>
                                      handleDriverDraftChange(
                                        booking.id,
                                        "vehicleName",
                                        e.target.value
                                      )
                                    }
                                    style={driverInputStyle}
                                  />

                                  <input
                                    type="text"
                                    placeholder="Plat nomor"
                                    value={driverDraft.plateNumber}
                                    onChange={(e) =>
                                      handleDriverDraftChange(
                                        booking.id,
                                        "plateNumber",
                                        e.target.value.toUpperCase()
                                      )
                                    }
                                    style={driverInputStyle}
                                  />

                                  <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => handleSaveDriver(booking.id)}
                                    disabled={isSavingDriver}
                                    style={{
                                      width: "100%",
                                      opacity: isSavingDriver ? 0.7 : 1,
                                    }}
                                  >
                                    {isSavingDriver
                                      ? "Menyimpan Driver..."
                                      : "Simpan Driver"}
                                  </button>
                                </div>
                              </td>

                              <td style={tdStyle}>
                                <div
                                  style={{
                                    maxWidth: "240px",
                                    wordBreak: "break-word",
                                    color: booking.note ? "#ffffff" : "#9f9f9f",
                                  }}
                                >
                                  {booking.note || "-"}
                                </div>
                              </td>

                              <td style={tdStyle}>
                                <div
                                  style={{
                                    maxWidth: "220px",
                                    wordBreak: "break-word",
                                    color: booking.cancelReason
                                      ? "#ffffff"
                                      : "#9f9f9f",
                                  }}
                                >
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
                                  style={{
                                    width: "100%",
                                    opacity: hasPhone ? 1 : 0.5,
                                  }}
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
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "10px",
                                    width: "100%",
                                    minWidth: "200px",
                                  }}
                                >
                                  <select
                                    className="select-dark"
                                    value={
                                      bookingStatusDrafts[booking.id] ||
                                      booking.status
                                    }
                                    onChange={(e) =>
                                      handleBookingStatusChange(
                                        booking.id,
                                        e.target.value
                                      )
                                    }
                                    style={{
                                      padding: "10px 12px",
                                      width: "100%",
                                    }}
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
                                    onClick={() =>
                                      handleSaveBookingStatus(booking.id)
                                    }
                                    disabled={isUpdating}
                                    style={{
                                      padding: "10px 12px",
                                      fontSize: "13px",
                                      opacity: isUpdating ? 0.7 : 1,
                                      width: "100%",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {isUpdating ? "Menyimpan..." : "Simpan Status"}
                                  </button>
                                </div>
                              </td>

                              <td style={tdStyle}>
                                {formatDateTime(booking.createdAt)}
                              </td>

                              <td style={tdStyle}>
                                {formatDateTime(booking.updatedAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}