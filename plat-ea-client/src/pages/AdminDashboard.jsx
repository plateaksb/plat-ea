import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
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
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) fetchBookings();
  }, [token]);

  const analytics = useMemo(() => {
    const totalBookings = bookings.length;
    const pending = bookings.filter((b) => b.status === "PENDING").length;
    const accepted = bookings.filter((b) => b.status === "ACCEPTED").length;
    const ongoing = bookings.filter((b) => b.status === "ONGOING").length;
    const completedList = bookings.filter((b) => b.status === "COMPLETED");
    const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;

    const activeBookings = pending + accepted + ongoing;

    const totalRevenue = completedList.reduce(
      (sum, booking) => sum + Number(booking.finalPrice || 0),
      0
    );

    const todayRevenue = completedList
      .filter((booking) => isToday(booking.updatedAt || booking.createdAt))
      .reduce((sum, booking) => sum + Number(booking.finalPrice || 0), 0);

    const todayBookings = bookings.filter((booking) =>
      isToday(booking.createdAt)
    ).length;

    const todayCompleted = completedList.filter((booking) =>
      isToday(booking.updatedAt || booking.createdAt)
    ).length;

    const todayCancelled = bookings.filter(
      (booking) =>
        booking.status === "CANCELLED" &&
        isToday(booking.updatedAt || booking.createdAt)
    ).length;

    const serviceCountMap = bookings.reduce((acc, booking) => {
      const key = booking.serviceType || "LAINNYA";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const vehicleCountMap = bookings
      .filter((booking) => booking.vehicleType)
      .reduce((acc, booking) => {
        const key = booking.vehicleType;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    const serviceBreakdown = Object.entries(serviceCountMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value,
        percent: totalBookings ? Math.round((value / totalBookings) * 100) : 0,
      }));

    const vehicleBreakdown = Object.entries(vehicleCountMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value,
        percent: totalBookings ? Math.round((value / totalBookings) * 100) : 0,
      }));

    return {
      totalBookings,
      activeBookings,
      completedBookings: completedList.length,
      cancelledBookings: cancelled,
      pending,
      accepted,
      ongoing,
      totalRevenue,
      todayRevenue,
      todayBookings,
      todayCompleted,
      todayCancelled,
      serviceBreakdown,
      vehicleBreakdown,
      completedList,
    };
  }, [bookings]);

  function progressWidth(value, total) {
    if (!total) return "0%";
    return `${Math.max(0, Math.min(100, Math.round((value / total) * 100)))}%`;
  }

  function StatCard({ title, value, subtitle, accent = "#ffffff" }) {
    return (
      <div
        className="card-dark"
        style={{
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        }}
      >
        <div style={{ fontSize: "13px", color: "#9f9f9f" }}>{title}</div>
        <div
          style={{
            marginTop: "10px",
            fontSize: "30px",
            fontWeight: 900,
            color: accent,
          }}
        >
          {value}
        </div>
        {subtitle ? (
          <div style={{ marginTop: "8px", color: "#bdbdbd", fontSize: "13px" }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    );
  }

  function ProgressItem({ label, value, total, color, textColor }) {
    return (
      <div style={{ display: "grid", gap: "8px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            fontSize: "14px",
          }}
        >
          <span style={{ color: textColor || "#ffffff", fontWeight: 700 }}>
            {label}
          </span>
          <span style={{ color: "#cfcfcf" }}>
            {value} / {total}
          </span>
        </div>

        <div
          style={{
            height: "10px",
            borderRadius: "999px",
            backgroundColor: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: progressWidth(value, total),
              height: "100%",
              borderRadius: "999px",
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    );
  }

  function BreakdownList({ title, items, emptyText }) {
    return (
      <div className="card-dark" style={{ padding: "20px", display: "grid", gap: "16px" }}>
        <div style={{ fontSize: "20px", fontWeight: 800 }}>{title}</div>

        {items.length === 0 ? (
          <div style={{ color: "#9f9f9f", fontSize: "14px" }}>{emptyText}</div>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {items.map((item) => (
              <div key={item.label} style={{ display: "grid", gap: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{item.label}</span>
                  <span style={{ color: "#cfcfcf" }}>
                    {item.value} ({item.percent}%)
                  </span>
                </div>

                <div
                  style={{
                    height: "10px",
                    borderRadius: "999px",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${item.percent}%`,
                      height: "100%",
                      borderRadius: "999px",
                      backgroundColor: "#ffffff",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function handleExportExcel() {
    try {
      setExporting(true);

      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");

      const summaryRows = [
        { Metrik: "Total Booking", Nilai: analytics.totalBookings },
        { Metrik: "Booking Aktif", Nilai: analytics.activeBookings },
        { Metrik: "Booking Selesai", Nilai: analytics.completedBookings },
        { Metrik: "Booking Dibatalkan", Nilai: analytics.cancelledBookings },
        { Metrik: "Pending", Nilai: analytics.pending },
        { Metrik: "Accepted", Nilai: analytics.accepted },
        { Metrik: "Ongoing", Nilai: analytics.ongoing },
        { Metrik: "Booking Hari Ini", Nilai: analytics.todayBookings },
        { Metrik: "Selesai Hari Ini", Nilai: analytics.todayCompleted },
        { Metrik: "Batal Hari Ini", Nilai: analytics.todayCancelled },
        { Metrik: "Omzet Selesai", Nilai: analytics.totalRevenue },
        { Metrik: "Omzet Hari Ini", Nilai: analytics.todayRevenue },
      ];

      const completedRows = analytics.completedList.map((booking, index) => ({
        No: index + 1,
        "ID Booking": booking.id,
        Pemesan: booking.user?.name || "-",
        "No HP": booking.user?.phone || "-",
        Layanan: booking.serviceType || "-",
        Kendaraan: booking.vehicleType || "-",
        Pickup: booking.pickup || "-",
        Tujuan: booking.destination || "-",
        Jarak_Km: Number(booking.distance || 0),
        Harga_Final: Number(booking.finalPrice || 0),
        Pembayaran: booking.paymentMethod || "-",
        Driver: booking.driverName || "-",
        No_Driver: booking.driverPhone || "-",
        Kendaraan_Driver: booking.vehicleName || "-",
        Plat_Nomor: booking.plateNumber || "-",
        Dibuat: formatDateTime(booking.createdAt),
        Diperbarui: formatDateTime(booking.updatedAt),
      }));

      const serviceRows = analytics.serviceBreakdown.map((item) => ({
        Layanan: item.label,
        Jumlah: item.value,
        Persentase: `${item.percent}%`,
      }));

      const vehicleRows = analytics.vehicleBreakdown.map((item) => ({
        Kendaraan: item.label,
        Jumlah: item.value,
        Persentase: `${item.percent}%`,
      }));

      const workbook = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      const completedSheet = XLSX.utils.json_to_sheet(completedRows);
      const serviceSheet = XLSX.utils.json_to_sheet(serviceRows);
      const vehicleSheet = XLSX.utils.json_to_sheet(vehicleRows);

      summarySheet["!cols"] = [
        { wch: 28 },
        { wch: 18 },
      ];

      completedSheet["!cols"] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 35 },
        { wch: 35 },
        { wch: 12 },
        { wch: 16 },
        { wch: 14 },
        { wch: 20 },
        { wch: 18 },
        { wch: 20 },
        { wch: 16 },
        { wch: 22 },
        { wch: 22 },
      ];

      serviceSheet["!cols"] = [
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
      ];

      vehicleSheet["!cols"] = [
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
      ];

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Omzet");
      XLSX.utils.book_append_sheet(workbook, completedSheet, "Booking Selesai");
      XLSX.utils.book_append_sheet(workbook, serviceSheet, "Distribusi Layanan");
      XLSX.utils.book_append_sheet(workbook, vehicleSheet, "Distribusi Kendaraan");

      XLSX.writeFile(workbook, `omzet-admin-${timestamp}.xlsx`);
    } catch (error) {
      setErrorMessage("Gagal export Excel. Pastikan library xlsx sudah terpasang.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="card-dark" style={{ padding: "20px" }}>
        Memuat dashboard...
      </div>
    );
  }

  if (errorMessage) {
    return (
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
    );
  }

  return (
    <section style={{ display: "grid", gap: "20px" }}>
      <div
        className="card-dark"
        style={{
          padding: "18px",
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>
            Dashboard Analitik Admin
          </div>
          <div style={{ marginTop: "6px", color: "#bdbdbd", fontSize: "14px" }}>
            Export ringkasan omzet dan daftar booking selesai ke file Excel.
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleExportExcel}
          disabled={exporting}
        >
          {exporting ? "Menyiapkan Excel..." : "Export Omzet Excel"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          title="Total Booking"
          value={analytics.totalBookings}
          subtitle="Seluruh transaksi masuk"
          accent="#ffffff"
        />
        <StatCard
          title="Booking Aktif"
          value={analytics.activeBookings}
          subtitle="Pending, accepted, ongoing"
          accent="#bfdbfe"
        />
        <StatCard
          title="Booking Selesai"
          value={analytics.completedBookings}
          subtitle="Transaksi berhasil selesai"
          accent="#bbf7d0"
        />
        <StatCard
          title="Booking Dibatalkan"
          value={analytics.cancelledBookings}
          subtitle="Transaksi yang dibatalkan"
          accent="#fecaca"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          title="Omzet Selesai"
          value={formatRupiah(analytics.totalRevenue)}
          subtitle="Akumulasi booking completed"
          accent="#ffffff"
        />
        <StatCard
          title="Omzet Hari Ini"
          value={formatRupiah(analytics.todayRevenue)}
          subtitle="Booking selesai hari ini"
          accent="#bbf7d0"
        />
        <StatCard
          title="Booking Hari Ini"
          value={analytics.todayBookings}
          subtitle="Order baru hari ini"
          accent="#fde68a"
        />
        <StatCard
          title="Selesai Hari Ini"
          value={analytics.todayCompleted}
          subtitle="Order completed hari ini"
          accent="#d8b4fe"
        />
      </div>

      <div
        className="admin-dashboard-two-col"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr)",
          gap: "16px",
        }}
      >
        <div className="card-dark" style={{ padding: "20px", display: "grid", gap: "16px" }}>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Progress Status Booking</div>

          <ProgressItem
            label="Pending"
            value={analytics.pending}
            total={analytics.totalBookings}
            color="#fde68a"
            textColor="#fde68a"
          />
          <ProgressItem
            label="Accepted"
            value={analytics.accepted}
            total={analytics.totalBookings}
            color="#93c5fd"
            textColor="#bfdbfe"
          />
          <ProgressItem
            label="Ongoing"
            value={analytics.ongoing}
            total={analytics.totalBookings}
            color="#d8b4fe"
            textColor="#d8b4fe"
          />
          <ProgressItem
            label="Completed"
            value={analytics.completedBookings}
            total={analytics.totalBookings}
            color="#86efac"
            textColor="#bbf7d0"
          />
          <ProgressItem
            label="Cancelled"
            value={analytics.cancelledBookings}
            total={analytics.totalBookings}
            color="#fca5a5"
            textColor="#fecaca"
          />
        </div>

        <div className="card-dark" style={{ padding: "20px", display: "grid", gap: "16px" }}>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Ringkasan Hari Ini</div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              color: "#d1d5db",
              fontSize: "14px",
              lineHeight: 1.8,
            }}
          >
            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              Order masuk hari ini: <strong>{analytics.todayBookings}</strong>
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              Order selesai hari ini: <strong>{analytics.todayCompleted}</strong>
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              Order batal hari ini: <strong>{analytics.todayCancelled}</strong>
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              Omzet hari ini: <strong>{formatRupiah(analytics.todayRevenue)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        <BreakdownList
          title="Distribusi Layanan"
          items={analytics.serviceBreakdown}
          emptyText="Belum ada data layanan."
        />

        <BreakdownList
          title="Distribusi Kendaraan Taksi"
          items={analytics.vehicleBreakdown}
          emptyText="Belum ada data kendaraan taksi."
        />
      </div>
    </section>
  );
}