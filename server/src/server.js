const app = require("./app");

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan di port ${PORT}`);
}).on("error", (err) => {
  console.error("Gagal menjalankan server:", err);
  process.exit(1);
});