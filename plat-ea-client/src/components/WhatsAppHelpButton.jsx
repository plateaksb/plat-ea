export default function WhatsAppHelpButton() {
  const phone = "6281339071500";
  const message =
    "Halo admin PLAT EA, aku butuh bantuanmu nih..";
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat WhatsApp Admin PLAT EA"
      title="Butuh bantuan menentukan titik jemput atau tujuan? Chat admin."
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "14px 18px",
        borderRadius: "999px",
        backgroundColor: "#25D366",
        color: "#ffffff",
        textDecoration: "none",
        fontWeight: 800,
        fontSize: "14px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      <span
        style={{
          width: "22px",
          height: "22px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          lineHeight: 1,
        }}
      >
        💬
      </span>
      <span>Chat Admin</span>
    </a>
  );
}