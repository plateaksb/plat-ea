import { Link } from "react-router-dom";

const stats = [
  { value: "24/7", label: "Layanan aktif" },
  { value: "3", label: "Jenis layanan" },
  { value: "Real-time", label: "Tracking order" },
  { value: "Admin", label: "Panel kontrol" },
];

export default function Hero() {
  return (
    <section className="section-padding" style={{ paddingTop: 72, paddingBottom: 32 }}>
      <div className="container hero-grid">
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              borderRadius: "999px",
              backgroundColor: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: "13px",
              color: "#d0d0d0",
              marginBottom: "20px",
            }}
          >
            <span>●</span>
            Platform pemesanan modern
          </div>

          <h1 className="hero-title">
            Satu aplikasi untuk taksi, ojek, dan delivery.
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.75,
              color: "#c7c7c7",
              maxWidth: "620px",
              marginBottom: "30px",
            }}
          >
            PLAT EA memudahkan pengguna memesan perjalanan dan pengiriman
            barang dengan pengalaman yang cepat, elegan, dan mudah dipantau
            dari dashboard admin.
          </p>

          <div className="hero-actions">
            <Link to="/booking" className="btn-primary">
              Pesan Sekarang
            </Link>

            <Link to="/login" className="btn-secondary">
              Login Dulu
            </Link>
          </div>

          <div className="stats-grid">
            {stats.map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "18px",
                  borderRadius: "18px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>
                  {item.value}
                </div>
                <div style={{ fontSize: "13px", color: "#bbbbbb" }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div
            className="card-soft"
            style={{
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", color: "#b9b9b9" }}>
                  Estimasi Pemesanan
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>
                  PLAT EA - Roda Empat
                </div>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "999px",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                Online
              </div>
            </div>

            <div style={{ display: "grid", gap: "14px", marginBottom: "18px" }}>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#111111",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: "13px", color: "#a9a9a9" }}>
                  Titik Jemput
                </div>
                <div style={{ marginTop: "6px", fontWeight: 700 }}>
                  Pelabuhan Poto Tano
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#111111",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: "13px", color: "#a9a9a9" }}>
                  Tujuan
                </div>
                <div style={{ marginTop: "6px", fontWeight: 700 }}>
                  Gate AMMAN Benete
                </div>
              </div>
            </div>

            <div className="duo-grid" style={{ marginBottom: "18px" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                }}
              >
                <div style={{ fontSize: "13px", color: "#b8b8b8" }}>
                  Estimasi Harga
                </div>
                <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 800 }}>
                  Rp309.000
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
                  Waktu Jemput
                </div>
                <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 800 }}>
                  20 Menit
                </div>
              </div>
            </div>

            <Link
              to="/booking"
              className="btn-primary"
              style={{ width: "100%" }}
            >
              Konfirmasi Pemesanan
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}