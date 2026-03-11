const services = [
  {
    title: "Taksi Roda Empat",
    desc: "Perjalanan nyaman untuk aktivitas harian, antar jemput, dan perjalanan jarak menengah.",
    icon: "🚖",
  },
  {
    title: "Ojek Roda Dua",
    desc: "Solusi cepat dan fleksibel untuk mobilitas harian di area ramai dan padat.",
    icon: "🛵",
  },
  {
    title: "Delivery Barang",
    desc: "Kirim barang dengan proses mudah, cepat, dan pelacakan yang jelas.",
    icon: "📦",
  },
];

export default function Services() {
  return (
    <section className="section-padding" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="container grid-3">
        {services.map((service) => (
          <div
            key={service.title}
            className="card-dark"
            style={{ padding: "26px" }}
          >
            <div style={{ fontSize: "34px", marginBottom: "14px" }}>
              {service.icon}
            </div>
            <h3 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 800 }}>
              {service.title}
            </h3>
            <p
              style={{
                margin: 0,
                color: "#c4c4c4",
                lineHeight: 1.7,
                fontSize: "15px",
              }}
            >
              {service.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}