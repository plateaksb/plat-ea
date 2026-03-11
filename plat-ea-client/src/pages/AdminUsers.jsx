import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

export default function AdminUsers() {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [lastUpdated, setLastUpdated] = useState(null);

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

  async function fetchUsers(showMainLoader = false) {
    try {
      if (showMainLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage("");

      const response = await fetch(buildApiUrl("/admin/users"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil daftar user");
      }

      setUsers(result.data);
      setLastUpdated(new Date());
    } catch (error) {
      setErrorMessage(
        error.message || "Terjadi kesalahan saat mengambil daftar user"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (token) {
      fetchUsers(true);
    }
  }, [token]);

  const summary = useMemo(() => {
    const totalUsers = users.length;
    const adminUsers = users.filter((user) => user.role === "ADMIN").length;
    const normalUsers = users.filter((user) => user.role !== "ADMIN").length;
    const totalBookings = users.reduce(
      (sum, user) => sum + Number(user.stats?.totalBookings || 0),
      0
    );

    return {
      totalUsers,
      adminUsers,
      normalUsers,
      totalBookings,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (roleFilter !== "ALL") {
      result = result.filter((user) => user.role === roleFilter);
    }

    const keyword = searchTerm.trim().toLowerCase();
    if (keyword) {
      result = result.filter((user) => {
        const haystack = [user.id, user.name, user.email, user.phone, user.role]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(keyword);
      });
    }

    const sorted = [...result].sort((a, b) => {
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      const aSpent = Number(a.stats?.totalSpent || 0);
      const bSpent = Number(b.stats?.totalSpent || 0);
      const aBookings = Number(a.stats?.totalBookings || 0);
      const bBookings = Number(b.stats?.totalBookings || 0);

      switch (sortBy) {
        case "OLDEST":
          return aCreated - bCreated;
        case "MOST_SPENT":
          return bSpent - aSpent;
        case "MOST_BOOKINGS":
          return bBookings - aBookings;
        case "NEWEST":
        default:
          return bCreated - aCreated;
      }
    });

    return sorted;
  }, [users, roleFilter, searchTerm, sortBy]);

  return (
    <section style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px", fontSize: "30px" }}>
            Data User Terdaftar
          </h2>
          <p style={{ margin: 0, color: "#bdbdbd", lineHeight: 1.7 }}>
            Daftar seluruh user yang telah register di website PLAT EA.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => fetchUsers(false)}
          disabled={refreshing}
        >
          {refreshing ? "Memperbarui..." : "Refresh"}
        </button>
      </div>

      {lastUpdated && !loading && (
        <div style={{ color: "#9f9f9f", fontSize: "13px" }}>
          Terakhir diperbarui: {formatDateTime(lastUpdated)}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="card-dark" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>Total User</div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.totalUsers}
          </div>
        </div>

        <div className="card-dark" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>User Biasa</div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.normalUsers}
          </div>
        </div>

        <div className="card-dark" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>Admin</div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.adminUsers}
          </div>
        </div>

        <div className="card-dark" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
            Total Booking dari User
          </div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.totalBookings}
          </div>
        </div>
      </div>

      <div
        className="card-dark"
        style={{
          padding: "18px",
          display: "grid",
          gap: "14px",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: "15px" }}>Filter Data User</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <input
            type="text"
            className="input-dark"
            placeholder="Cari nama, email, no hp, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="select-dark"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Semua Role</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <select
            className="select-dark"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="NEWEST">Urutkan: Terbaru</option>
            <option value="OLDEST">Urutkan: Terlama</option>
            <option value="MOST_SPENT">Urutkan: Pengeluaran Tertinggi</option>
            <option value="MOST_BOOKINGS">Urutkan: Booking Terbanyak</option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            color: "#9f9f9f",
            fontSize: "13px",
          }}
        >
          <div>
            Menampilkan <strong>{filteredUsers.length}</strong> user
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearchTerm("");
              setRoleFilter("ALL");
              setSortBy("NEWEST");
            }}
          >
            Reset Filter
          </button>
        </div>
      </div>

      {loading && (
        <div className="card-dark" style={{ padding: "20px" }}>
          Memuat data user...
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

      {!loading && !errorMessage && filteredUsers.length === 0 && (
        <div className="card-dark" style={{ padding: "20px" }}>
          Tidak ada data user yang cocok dengan filter.
        </div>
      )}

      {!loading && filteredUsers.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="card-dark"
              style={{
                padding: "20px",
                display: "grid",
                gap: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 800 }}>
                    {user.name || "-"}
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      color: "#9f9f9f",
                      fontSize: "13px",
                      wordBreak: "break-word",
                    }}
                  >
                    ID: {user.id}
                  </div>
                </div>

                <span
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    backgroundColor:
                      user.role === "ADMIN"
                        ? "rgba(59,130,246,0.16)"
                        : "rgba(255,255,255,0.08)",
                    color: user.role === "ADMIN" ? "#bfdbfe" : "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {user.role}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Email</div>
                  <div
                    style={{
                      marginTop: "6px",
                      fontWeight: 700,
                      wordBreak: "break-word",
                    }}
                  >
                    {user.email || "-"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f" }}>No. HP</div>
                  <div style={{ marginTop: "6px", fontWeight: 700 }}>
                    {user.phone || "-"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f" }}>
                    Tanggal Register
                  </div>
                  <div style={{ marginTop: "6px", fontWeight: 700 }}>
                    {formatDateTime(user.createdAt)}
                  </div>
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
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f" }}>
                    Total Booking
                  </div>
                  <div
                    style={{ marginTop: "6px", fontSize: "24px", fontWeight: 900 }}
                  >
                    {user.stats?.totalBookings || 0}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f" }}>
                    Booking Selesai
                  </div>
                  <div
                    style={{ marginTop: "6px", fontSize: "24px", fontWeight: 900 }}
                  >
                    {user.stats?.completedBookings || 0}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f" }}>
                    Booking Dibatalkan
                  </div>
                  <div
                    style={{ marginTop: "6px", fontSize: "24px", fontWeight: 900 }}
                  >
                    {user.stats?.cancelledBookings || 0}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    backgroundColor: "#ffffff",
                    color: "#000000",
                  }}
                >
                  <div style={{ fontSize: "12px", opacity: 0.7 }}>
                    Total Pengeluaran
                  </div>
                  <div
                    style={{ marginTop: "6px", fontSize: "24px", fontWeight: 900 }}
                  >
                    {formatRupiah(user.stats?.totalSpent || 0)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}