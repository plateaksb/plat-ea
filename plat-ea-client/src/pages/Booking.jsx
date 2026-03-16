import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import LiveMapPicker from "../components/LiveMapPicker";
import { buildApiUrl } from "../lib/api";

const MANDIRI_ACCOUNT = "1610011115065";

export default function Booking() {
  const navigate = useNavigate();
  const { token, user, isAuthenticated } = useAuth();

  const [service, setService] = useState("taxi");
  const [taxiType, setTaxiType] = useState("car4");
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);

  const [distance, setDistance] = useState(0);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routePolyline, setRoutePolyline] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const [estimate, setEstimate] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [locatingPickup, setLocatingPickup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [bookingResult, setBookingResult] = useState(null);

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

  function formatScheduledLabel(dateValue, timeValue) {
    if (!dateValue || !timeValue) return "-";

    const combined = new Date(`${dateValue}T${timeValue}:00`);
    if (Number.isNaN(combined.getTime())) {
      return `${dateValue} ${timeValue}`;
    }

    return combined.toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });
  }

  function handleSwapLocations() {
    setErrorMessage("");
    setSuccessMessage("");
    setBookingResult(null);

    setPickup(destination);
    setDestination(pickup);
  }

  function handleResetLocations() {
    setErrorMessage("");
    setSuccessMessage("");
    setBookingResult(null);

    setPickup(null);
    setDestination(null);
    setDistance(0);
    setRouteInfo(null);
    setRoutePolyline("");
    setEstimate(null);
  }

  async function reverseGeocode(lat, lng) {
    const response = await fetch(buildApiUrl("/maps/reverse-geocode"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lat, lng }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Gagal membaca alamat dari lokasi saat ini"
      );
    }

    return result.data;
  }

  async function handleUseMyLocation() {
    try {
      setLocatingPickup(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!navigator.geolocation) {
        throw new Error("Browser ini tidak mendukung geolocation");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const payload = await reverseGeocode(lat, lng);
      setPickup(payload);
      setSuccessMessage("Lokasi saat ini berhasil dipakai sebagai titik jemput.");
    } catch (error) {
      setErrorMessage(
        error.message || "Gagal mengambil lokasi saat ini untuk pickup"
      );
    } finally {
      setLocatingPickup(false);
    }
  }

  async function fetchLiveRoute() {
    if (!pickup || !destination) return;

    try {
      setRouteLoading(true);
      setErrorMessage("");

      const response = await fetch(buildApiUrl("/maps/route"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: pickup,
          destination,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menghitung rute live");
      }

      setRouteInfo(result.data);
      setDistance(result.data.distanceKm);
      setRoutePolyline(result.data.polyline || "");
    } catch (error) {
      setRouteInfo(null);
      setDistance(0);
      setRoutePolyline("");
      setErrorMessage(error.message || "Terjadi kesalahan saat menghitung rute");
    } finally {
      setRouteLoading(false);
    }
  }

  async function fetchEstimate() {
    if (!distance || distance <= 0) {
      setEstimate(null);
      return;
    }

    try {
      setEstimateLoading(true);
      setErrorMessage("");

      const response = await fetch(buildApiUrl("/bookings/estimate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service,
          taxiType,
          distance,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menghitung estimasi");
      }

      setEstimate(result.data);
    } catch (error) {
      setEstimate(null);
      setErrorMessage(
        error.message || "Terjadi kesalahan saat menghitung estimasi"
      );
    } finally {
      setEstimateLoading(false);
    }
  }

  useEffect(() => {
    if (pickup && destination) {
      fetchLiveRoute();
    } else {
      setRouteInfo(null);
      setDistance(0);
      setRoutePolyline("");
      setEstimate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, destination]);

  useEffect(() => {
    if (distance > 0) {
      fetchEstimate();
    } else {
      setEstimate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, taxiType, distance]);

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setBookingResult(null);

    if (!isAuthenticated) {
      setErrorMessage(
        "Silakan login atau register terlebih dahulu untuk membuat booking."
      );
      return;
    }

    if (
      !pickup?.address ||
      !destination?.address ||
      pickup?.lat == null ||
      pickup?.lng == null ||
      destination?.lat == null ||
      destination?.lng == null ||
      distance <= 0
    ) {
      setErrorMessage("Silakan pilih titik jemput dan tujuan dari peta.");
      return;
    }

    if (isScheduled && (!scheduleDate || !scheduleTime)) {
      setErrorMessage("Tanggal dan jam booking terjadwal wajib diisi.");
      return;
    }

    try {
      setBookingLoading(true);

      const response = await fetch(buildApiUrl("/bookings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service,
          taxiType,
          pickup: pickup.address,
          destination: destination.address,
          distance,
          note,
          paymentMethod,
          scheduleDate: isScheduled ? scheduleDate : "",
          scheduleTime: isScheduled ? scheduleTime : "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Booking gagal dibuat");
      }

      setBookingResult(result.data);
      setSuccessMessage("Booking berhasil dibuat.");
      setNote("");
      setIsScheduled(false);
      setScheduleDate("");
      setScheduleTime("");

      setTimeout(() => {
        navigate("/history");
      }, 800);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat membuat booking");
    } finally {
      setBookingLoading(false);
    }
  }

  const breakdown = estimate?.breakdown || {};
  const activeLabel =
    estimate?.vehicleLabel ||
    (service === "taxi"
      ? "Mobil Kapasitas 4 Orang"
      : service === "bike"
      ? "Ojek Roda Dua"
      : "Delivery Barang");

  return (
    <div className="page-shell">
      <Navbar />

      <main
        className="section-padding"
        style={{ paddingTop: 40, paddingBottom: 80 }}
      >
        <div className="container">
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ margin: "0 0 10px", fontSize: "40px" }}>
              Booking PLAT EA
            </h1>
            <p
              style={{
                margin: 0,
                color: "#bbbbbb",
                lineHeight: 1.7,
                maxWidth: "760px",
              }}
            >
              Pilih lokasi jemput dan tujuan langsung dari Google Maps. Jarak,
              rute, dan estimasi dihitung otomatis.
            </p>
          </div>

          <div className="booking-grid">
            <form
              onSubmit={handleSubmit}
              className="card-dark"
              style={{ padding: "24px", display: "grid", gap: "18px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#cfcfcf",
                  }}
                >
                  Pilih Layanan
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="select-dark"
                >
                  <option value="taxi">Taksi Roda Empat</option>
                  <option value="bike">Ojek Roda Dua</option>
                  <option value="delivery">Delivery Barang</option>
                </select>
              </div>

              {service === "taxi" && (
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      color: "#cfcfcf",
                    }}
                  >
                    Pilih Jenis Mobil
                  </label>
                  <select
                    value={taxiType}
                    onChange={(e) => setTaxiType(e.target.value)}
                    className="select-dark"
                  >
                    <option value="car4">Mobil Kapasitas 4 Orang</option>
                    <option value="car6">Mobil Kapasitas 6 Orang</option>
                    <option value="premium">Mobil Premium</option>
                  </select>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#cfcfcf",
                    fontWeight: 700,
                  }}
                >
                  Pilih lokasi jemput dan tujuan
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleUseMyLocation}
                    disabled={locatingPickup}
                    style={{ opacity: locatingPickup ? 0.7 : 1 }}
                  >
                    {locatingPickup
                      ? "Mengambil Lokasi..."
                      : "Gunakan Lokasi Saya"}
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSwapLocations}
                    disabled={!pickup || !destination}
                    style={{
                      opacity: !pickup || !destination ? 0.6 : 1,
                    }}
                  >
                    Tukar Pickup ↔ Tujuan
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleResetLocations}
                    disabled={!pickup && !destination}
                    style={{
                      opacity: !pickup && !destination ? 0.6 : 1,
                    }}
                  >
                    Reset Lokasi
                  </button>
                </div>
              </div>

              <LiveMapPicker
                pickup={pickup}
                destination={destination}
                routePolyline={routePolyline}
                onPickupSelect={setPickup}
                onDestinationSelect={setDestination}
              />

              <div className="duo-grid">
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f" }}>
                    Titik Jemput
                  </div>
                  <div style={{ marginTop: "8px", fontWeight: 700 }}>
                    {pickup?.address || "-"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f" }}>
                    Titik Tujuan
                  </div>
                  <div style={{ marginTop: "8px", fontWeight: 700 }}>
                    {destination?.address || "-"}
                  </div>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#cfcfcf",
                  }}
                >
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="select-dark"
                >
                  <option value="CASH">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              {paymentMethod === "TRANSFER" && (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "14px",
                    backgroundColor: "rgba(59, 130, 246, 0.12)",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    color: "#bfdbfe",
                    fontSize: "14px",
                    lineHeight: 1.7,
                  }}
                >
                  Transfer ke:
                  <br />
                  <strong>Bank Mandiri</strong>
                  <br />
                  No. Rekening: <strong>{MANDIRI_ACCOUNT}</strong>
                </div>
              )}

              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "grid",
                  gap: "12px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "14px",
                    color: "#cfcfcf",
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                  />
                  Booking Terjadwal
                </label>

                {isScheduled && (
                  <div className="duo-grid">
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          color: "#cfcfcf",
                        }}
                      >
                        Tanggal Penjemputan
                      </label>
                      <input
                        type="date"
                        className="input-dark"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          color: "#cfcfcf",
                        }}
                      >
                        Jam Penjemputan
                      </label>
                      <input
                        type="time"
                        className="input-dark"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#cfcfcf",
                  }}
                >
                  Catatan untuk Driver / Admin
                </label>
                <textarea
                  className="input-dark"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: jemput di gerbang depan, bawa barang pecah belah, dst."
                  rows={4}
                  style={{ resize: "vertical", minHeight: "110px" }}
                />
              </div>

              {isAuthenticated && user ? (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "14px",
                    backgroundColor: "rgba(80, 200, 120, 0.12)",
                    border: "1px solid rgba(80, 200, 120, 0.35)",
                    color: "#bff0ce",
                    fontSize: "14px",
                    lineHeight: 1.6,
                  }}
                >
                  Booking ini akan dikaitkan ke akun:{" "}
                  <strong>{user.name}</strong> ({user.email})
                </div>
              ) : (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "14px",
                    backgroundColor: "rgba(255, 193, 7, 0.12)",
                    border: "1px solid rgba(255, 193, 7, 0.35)",
                    color: "#ffe08a",
                    fontSize: "14px",
                    lineHeight: 1.7,
                  }}
                >
                  Kamu harus login atau register terlebih dahulu sebelum membuat
                  booking.
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "12px",
                    }}
                  >
                    <Link to="/login" className="btn-primary">
                      Login
                    </Link>
                    <Link to="/register" className="btn-secondary">
                      Register
                    </Link>
                  </div>
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
                  }}
                >
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: "100%",
                  opacity: bookingLoading || !isAuthenticated ? 0.7 : 1,
                }}
                disabled={bookingLoading || !isAuthenticated}
              >
                {bookingLoading ? "Memproses Booking..." : "Konfirmasi Booking"}
              </button>
            </form>

            <div
              className="card-soft"
              style={{ padding: "24px", display: "grid", gap: "16px" }}
            >
              <div>
                <div style={{ fontSize: "14px", color: "#b9b9b9" }}>
                  Ringkasan Pesanan
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "26px",
                    fontWeight: 800,
                  }}
                >
                  {activeLabel}
                </div>
              </div>

              <div className="duo-grid">
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#b8b8b8" }}>
                    Jarak Live
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "22px",
                      fontWeight: 800,
                    }}
                  >
                    {routeLoading ? "..." : `${distance || 0} km`}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#b8b8b8" }}>
                    Durasi Rute
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "22px",
                      fontWeight: 800,
                    }}
                  >
                    {routeLoading
                      ? "..."
                      : `${routeInfo?.durationMinutes || 0} menit`}
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
                  Estimasi Harga Final
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "32px",
                    fontWeight: 900,
                  }}
                >
                  {estimateLoading
                    ? "Menghitung..."
                    : formatRupiah(estimate?.price || 0)}
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#c8c8c8",
                  lineHeight: 1.8,
                  fontSize: "14px",
                }}
              >
                <strong>Rincian Tarif</strong>
                <br />
                Tarif Dasar:{" "}
                {estimateLoading
                  ? "..."
                  : formatRupiah(breakdown.baseFare || 0)}
                <br />
                Tarif per Km:{" "}
                {estimateLoading
                  ? "..."
                  : formatRupiah(breakdown.perKm || 0)}
                <br />
                Minimum Tarif:{" "}
                {estimateLoading
                  ? "..."
                  : formatRupiah(breakdown.minimumFare || 0)}
                <br />
                Harga Awal:{" "}
                {estimateLoading
                  ? "..."
                  : formatRupiah(breakdown.calculatedPrice || 0)}
                <br />
                Harga Final:{" "}
                {estimateLoading
                  ? "..."
                  : formatRupiah(breakdown.finalPrice || 0)}
                <br />
                Pembayaran: {paymentLabel(paymentMethod)}
                <br />
                Jenis Booking: {isScheduled ? "Terjadwal" : "Sekarang"}
                {isScheduled && scheduleDate && scheduleTime ? (
                  <>
                    <br />
                    Jadwal: {formatScheduledLabel(scheduleDate, scheduleTime)}
                  </>
                ) : null}
                <br />
                Catatan: {note.trim() ? note : "-"}
              </div>

              {bookingResult && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#ffffff",
                    lineHeight: 1.8,
                    fontSize: "14px",
                  }}
                >
                  <strong>Hasil Booking</strong>
                  <br />
                  ID: {bookingResult.id}
                  <br />
                  Status: {bookingResult.status}
                  <br />
                  Harga: {formatRupiah(bookingResult.price)}
                  <br />
                  Estimasi Jemput: {bookingResult.eta} menit
                  <br />
                  Pembayaran: {paymentLabel(bookingResult.paymentMethod)}
                  <br />
                  Jenis Booking:{" "}
                  {bookingResult.isScheduled ? "Terjadwal" : "Sekarang"}
                  <br />
                  Jadwal:{" "}
                  {bookingResult.scheduledAt
                    ? new Date(bookingResult.scheduledAt).toLocaleString(
                        "id-ID"
                      )
                    : "-"}
                  <br />
                  Catatan: {bookingResult.note || "-"}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}