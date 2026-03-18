import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

const bookingStatuses = [
  "PENDING",
  "ASSIGNED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
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
    case "PENDING":
      return {
        ...base,
        backgroundColor: "rgba(234,179,8,0.16)",
        color: "#fde68a",
      };
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
        color: "#fff",
      };
  }
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        zIndex: 999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-dark"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "22px",
          borderRadius: "22px",
          display: "grid",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "22px", fontWeight: 900 }}>{title}</div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusFilterDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = value === "ALL" ? "Semua Status" : value;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          minHeight: "58px",
          padding: "0 18px",
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.12)",
          backgroundColor: "rgba(255,255,255,0.04)",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "16px",
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <span>{selectedLabel}</span>
        <span style={{ fontSize: "14px", opacity: 0.8 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            right: 0,
            zIndex: 50,
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.10)",
            backgroundColor: "rgba(10,10,10,0.96)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onChange("ALL");
              setOpen(false);
            }}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "14px 16px",
              border: "none",
              backgroundColor: value === "ALL" ? "rgba(255,255,255,0.08)" : "transparent",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            Semua Status
          </button>

          {options.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                onChange(status);
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "14px 16px",
                border: "none",
                backgroundColor:
                  value === status ? "rgba(255,255,255,0.08)" : "transparent",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              {status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminBookings() {
  const { token } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [statusModalBooking, setStatusModalBooking] = useState(null);
  const [assignModalBooking, setAssignModalBooking] = useState(null);

  const [statusDraft, setStatusDraft] = useState("PENDING");
  const [driverDraft, setDriverDraft] = useState("");

  const [savingStatus, setSavingStatus] = useState(false);
  const [savingDriver, setSavingDriver] = useState(false);

  async function fetchDrivers() {
    const response = await fetch(buildApiUrl("/admin/drivers"), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal mengambil data driver");
    }

    setDrivers((result.data || []).filter((item) => item.isActive));
  }

  async function fetchBookings() {
    const response = await fetch(buildApiUrl("/bookings"), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal mengambil data booking");
    }

    setBookings(result.data || []);
  }

  async function refreshAll(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");
      await Promise.all([fetchBookings(), fetchDrivers()]);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memuat data booking");
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

  function openStatusModal(booking) {
    setStatusModalBooking(booking);
    setStatusDraft(booking.status || "PENDING");
  }

  function openAssignModal(booking) {
    setAssignModalBooking(booking);
    setDriverDraft(booking.driverId || "");
  }

  async function handleSaveStatus() {
    if (!statusModalBooking) return;

    try {
      setSavingStatus(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        buildApiUrl(`/bookings/${statusModalBooking.id}/status`),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: statusDraft }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memperbarui status booking");
      }

      setSuccessMessage("Status booking berhasil diperbarui.");
      setStatusModalBooking(null);
      await refreshAll(true);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memperbarui status booking");
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleAssignDriver() {
    if (!assignModalBooking) return;

    try {
      setSavingDriver(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!driverDraft) {
        throw new Error("Pilih driver terlebih dahulu.");
      }

      const response = await fetch(
        buildApiUrl(`/bookings/${assignModalBooking.id}/assign-driver`),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ driverId: driverDraft }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal assign driver");
      }

      setSuccessMessage("Driver berhasil di-assign ke booking.");
      setAssignModalBooking(null);
      await refreshAll(true);
    } catch (error) {
      setErrorMessage(error.message || "Gagal assign driver");
    } finally {
      setSavingDriver(false);
    }
  }

  function openWhatsappConfirmation(booking) {
    const waNumber = normalizePhoneToWa(booking.user?.phone);

    if (!waNumber) {
      setErrorMessage("Nomor WhatsApp pelanggan tidak tersedia.");
      return;
    }

    const message = [
      `Halo ${booking.user?.name || "Pelanggan"}, pesanan Anda sedang kami proses.`,
      "",
      `Nama Pemesan: ${booking.user?.name || "-"}`,
      `No. HP Pemesan: ${booking.user?.phone || "-"}`,
      `Status: ${booking.status}`,
      `Pickup: ${booking.pickup || "-"}`,
      `Tujuan: ${booking.destination || "-"}`,
      `Driver: ${booking.driverName || "-"}`,
      `No. Driver: ${booking.driverPhone || "-"}`,
      `Kendaraan: ${booking.vehicleName || "-"}`,
      `Plat Nomor: ${booking.plateNumber || "-"}`,
      "",
      "Terima kasih telah menggunakan PLAT EA.",
    ].join("\n");

    window.open(
      `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const filteredBookings = useMemo(() => {
    let list = [...bookings];

    if (statusFilter !== "ALL") {
      list = list.filter((booking) => booking.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((booking) =>
        [
          booking.id,
          booking.pickup,
          booking.destination,
          booking.user?.name,
          booking.user?.phone,
          booking.driverName,
          booking.plateNumber,
          booking.serviceType,
          booking.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [bookings, statusFilter, searchTerm]);

  if (loading) {
    return (
      <div className="card-dark" style={{ padding: "20px" }}>
        Memuat data booking...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <div
        className="card-dark"
        style={{ padding: "18px", display: "grid", gap: "14px", overflow: "visible" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            overflow: "visible",
          }}
        >
          <div style={{ position: "relative", zIndex: 30 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 13,
                color: "#bdbdbd",
              }}
            >
              Filter Status
            </label>

            <StatusFilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={bookingStatuses}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 13,
                color: "#bdbdbd",
              }}
            >
              Cari Booking
            </label>
            <input
              className="input-dark"
              type="text"
              placeholder="Cari nama, pickup, tujuan, driver, plat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" className="btn-secondary" onClick={() => refreshAll(true)}>
            {refreshing ? "Menyegarkan..." : "Refresh Data"}
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

      {filteredBookings.length === 0 ? (
        <div className="card-dark" style={{ padding: "20px" }}>
          Belum ada booking yang cocok dengan filter.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {filteredBookings.map((booking) => {
            const canAssignDriver = booking.status === "PENDING";
            const canEditStatus = !["COMPLETED", "CANCELLED"].includes(booking.status);

            return (
              <div
                key={booking.id}
                className="card-dark"
                style={{
                  padding: "20px",
                  display: "grid",
                  gap: "16px",
                  transition: "0.2s",
                  cursor: "default",
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
                  }}
                >
                  <div style={{ display: "grid", gap: "8px" }}>
                    <div style={{ fontSize: "18px", fontWeight: 900 }}>
                      {booking.serviceType} • {formatRupiah(booking.finalPrice)}
                    </div>
                    <div>
                      <span style={getStatusBadgeStyle(booking.status)}>{booking.status}</span>
                    </div>
                    <div style={{ color: "#bdbdbd" }}>
                      Pemesan:{" "}
                      <strong style={{ color: "#fff" }}>{booking.user?.name || "-"}</strong>
                    </div>
                    <div style={{ color: "#bdbdbd" }}>
                      Telepon:{" "}
                      <strong style={{ color: "#fff" }}>{booking.user?.phone || "-"}</strong>
                    </div>
                    <div style={{ color: "#bdbdbd" }}>
                      Dibuat:{" "}
                      <strong style={{ color: "#fff" }}>
                        {formatDateTime(booking.createdAt)}
                      </strong>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", display: "grid", gap: "8px" }}>
                    <div style={{ color: "#9f9f9f", fontSize: "13px" }}>ID Booking</div>
                    <div style={{ fontWeight: 800 }}>{booking.id}</div>
                    <div style={{ color: "#bdbdbd" }}>
                      ETA: <strong style={{ color: "#fff" }}>{booking.eta} menit</strong>
                    </div>
                    <div style={{ color: "#bdbdbd" }}>
                      Jarak: <strong style={{ color: "#fff" }}>{booking.distance} km</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Pickup</div>
                    <div>{booking.pickup}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Tujuan</div>
                    <div>{booking.destination}</div>
                  </div>
                  <div style={{ color: "#bdbdbd" }}>
                    Catatan: <strong style={{ color: "#fff" }}>{booking.note || "-"}</strong>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div
                    className="card-dark"
                    style={{
                      padding: "14px",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9f9f9f",
                        marginBottom: 8,
                      }}
                    >
                      Driver Saat Ini
                    </div>
                    <div>Nama: {booking.driverName || "-"}</div>
                    <div>Telepon: {booking.driverPhone || "-"}</div>
                    <div>Kendaraan: {booking.vehicleName || "-"}</div>
                    <div>Plat Nomor: {booking.plateNumber || "-"}</div>
                  </div>

                  <div
                    className="card-dark"
                    style={{
                      padding: "14px",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9f9f9f",
                        marginBottom: 8,
                      }}
                    >
                      Timeline Order
                    </div>
                    <div>Assigned: {formatDateTime(booking.assignedAt)}</div>
                    <div>Started: {formatDateTime(booking.startedAt)}</div>
                    <div>Completed: {formatDateTime(booking.completedAt)}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!canAssignDriver}
                    onClick={() => openAssignModal(booking)}
                  >
                    Assign Driver
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!canEditStatus}
                    onClick={() => openStatusModal(booking)}
                  >
                    Ubah Status
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => openWhatsappConfirmation(booking)}
                  >
                    WhatsApp User
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(assignModalBooking)}
        title="Assign Driver"
        onClose={() => setAssignModalBooking(null)}
      >
        {assignModalBooking && (
          <>
            <div style={{ color: "#bdbdbd", lineHeight: 1.7 }}>
              Booking: <strong style={{ color: "#fff" }}>{assignModalBooking.id}</strong>
              <br />
              Pickup: <strong style={{ color: "#fff" }}>{assignModalBooking.pickup}</strong>
              <br />
              Tujuan: <strong style={{ color: "#fff" }}>{assignModalBooking.destination}</strong>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 13,
                  color: "#bdbdbd",
                }}
              >
                Pilih Driver Aktif
              </label>
              <select
                className="input-dark"
                value={driverDraft}
                onChange={(e) => setDriverDraft(e.target.value)}
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <option value="" style={{ backgroundColor: "#101010", color: "#ffffff" }}>
                  Pilih driver aktif
                </option>
                {drivers.map((driver) => (
                  <option
                    key={driver.id}
                    value={driver.id}
                    style={{ backgroundColor: "#101010", color: "#ffffff" }}
                  >
                    {driver.name} • {driver.vehicleName} • {driver.plateNumber}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAssignModalBooking(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={savingDriver}
                onClick={handleAssignDriver}
              >
                {savingDriver ? "Assigning driver..." : "Simpan Assign"}
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(statusModalBooking)}
        title="Ubah Status Booking"
        onClose={() => setStatusModalBooking(null)}
      >
        {statusModalBooking && (
          <>
            <div style={{ color: "#bdbdbd", lineHeight: 1.7 }}>
              Booking: <strong style={{ color: "#fff" }}>{statusModalBooking.id}</strong>
              <br />
              Status saat ini:{" "}
              <span style={getStatusBadgeStyle(statusModalBooking.status)}>
                {statusModalBooking.status}
              </span>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 13,
                  color: "#bdbdbd",
                }}
              >
                Pilih Status Baru
              </label>
              <select
                className="input-dark"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {bookingStatuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                    style={{ backgroundColor: "#101010", color: "#ffffff" }}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStatusModalBooking(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={savingStatus}
                onClick={handleSaveStatus}
              >
                {savingStatus ? "Menyimpan..." : "Simpan Status"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}