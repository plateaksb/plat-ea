import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

const roleOptions = ["USER", "ADMIN"];

export default function AdminUsers() {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [profileDrafts, setProfileDrafts] = useState({});
  const [statusDrafts, setStatusDrafts] = useState({});
  const [savingProfileId, setSavingProfileId] = useState("");
  const [savingStatusId, setSavingStatusId] = useState("");

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
      setSuccessMessage("");

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

      const nextProfileDrafts = {};
      const nextStatusDrafts = {};

      for (const user of result.data) {
        nextProfileDrafts[user.id] = {
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          role: user.role || "USER",
        };

        nextStatusDrafts[user.id] = {
          isActive: Boolean(user.isActive),
          isBlocked: Boolean(user.isBlocked),
          blockedReason: user.blockedReason || "",
        };
      }

      setProfileDrafts(nextProfileDrafts);
      setStatusDrafts(nextStatusDrafts);
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
    const inactiveUsers = users.filter((user) => !user.isActive).length;
    const blockedUsers = users.filter((user) => user.isBlocked).length;

    return {
      totalUsers,
      adminUsers,
      normalUsers,
      inactiveUsers,
      blockedUsers,
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
        const haystack = [
          user.id,
          user.name,
          user.email,
          user.phone,
          user.role,
          user.blockedReason,
        ]
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

  function handleProfileDraftChange(userId, field, value) {
    setProfileDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  }

  function handleStatusDraftChange(userId, field, value) {
    setStatusDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  }

  async function handleSaveProfile(userId) {
    try {
      setSavingProfileId(userId);
      setErrorMessage("");
      setSuccessMessage("");

      const draft = profileDrafts[userId];

      const response = await fetch(buildApiUrl(`/admin/users/${userId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui user");
      }

      setSuccessMessage("Data user berhasil diperbarui.");
      await fetchUsers(false);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memperbarui user");
    } finally {
      setSavingProfileId("");
    }
  }

  async function handleSaveStatus(userId) {
    try {
      setSavingStatusId(userId);
      setErrorMessage("");
      setSuccessMessage("");

      const draft = statusDrafts[userId];

      const response = await fetch(buildApiUrl(`/admin/users/${userId}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui status user");
      }

      setSuccessMessage("Status user berhasil diperbarui.");
      await fetchUsers(false);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memperbarui status user");
    } finally {
      setSavingStatusId("");
    }
  }

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
            Kelola User
          </h2>
          <p style={{ margin: 0, color: "#bdbdbd", lineHeight: 1.7 }}>
            Admin dapat mengedit user, menonaktifkan user, dan memblokir login
            user.
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
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>Admin</div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.adminUsers}
          </div>
        </div>

        <div className="card-dark" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>Nonaktif</div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.inactiveUsers}
          </div>
        </div>

        <div className="card-dark" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>Diblokir</div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.blockedUsers}
          </div>
        </div>
      </div>

      <div className="card-dark" style={{ padding: "18px", display: "grid", gap: "14px" }}>
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
      </div>

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

      {loading ? (
        <div className="card-dark" style={{ padding: "20px" }}>
          Memuat data user...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card-dark" style={{ padding: "20px" }}>
          Tidak ada data user.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {filteredUsers.map((user) => {
            const profileDraft = profileDrafts[user.id] || {
              name: "",
              email: "",
              phone: "",
              role: "USER",
            };

            const statusDraft = statusDrafts[user.id] || {
              isActive: true,
              isBlocked: false,
              blockedReason: "",
            };

            const isSavingProfile = savingProfileId === user.id;
            const isSavingStatus = savingStatusId === user.id;

            return (
              <div
                key={user.id}
                className="card-dark"
                style={{ padding: "20px", display: "grid", gap: "16px" }}
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
                    <div style={{ marginTop: "6px", color: "#9f9f9f", fontSize: "13px" }}>
                      ID: {user.id}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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

                    <span
                      style={{
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: user.isActive
                          ? "rgba(34,197,94,0.16)"
                          : "rgba(239,68,68,0.16)",
                        color: user.isActive ? "#bbf7d0" : "#fecaca",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {user.isActive ? "Aktif" : "Nonaktif"}
                    </span>

                    <span
                      style={{
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: user.isBlocked
                          ? "rgba(239,68,68,0.16)"
                          : "rgba(255,255,255,0.08)",
                        color: user.isBlocked ? "#fecaca" : "#ffffff",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {user.isBlocked ? "Diblokir" : "Tidak diblokir"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <input
                    className="input-dark"
                    placeholder="Nama"
                    value={profileDraft.name}
                    onChange={(e) =>
                      handleProfileDraftChange(user.id, "name", e.target.value)
                    }
                  />

                  <input
                    className="input-dark"
                    placeholder="Email"
                    value={profileDraft.email}
                    onChange={(e) =>
                      handleProfileDraftChange(user.id, "email", e.target.value)
                    }
                  />

                  <input
                    className="input-dark"
                    placeholder="Nomor HP"
                    value={profileDraft.phone}
                    onChange={(e) =>
                      handleProfileDraftChange(user.id, "phone", e.target.value)
                    }
                  />

                  <select
                    className="select-dark"
                    value={profileDraft.role}
                    onChange={(e) =>
                      handleProfileDraftChange(user.id, "role", e.target.value)
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleSaveProfile(user.id)}
                  disabled={isSavingProfile}
                  style={{ width: "100%", opacity: isSavingProfile ? 0.7 : 1 }}
                >
                  {isSavingProfile ? "Menyimpan Profil..." : "Simpan Profil User"}
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "14px",
                      borderRadius: "14px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={statusDraft.isActive}
                      onChange={(e) =>
                        handleStatusDraftChange(user.id, "isActive", e.target.checked)
                      }
                    />
                    Akun Aktif
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "14px",
                      borderRadius: "14px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={statusDraft.isBlocked}
                      onChange={(e) =>
                        handleStatusDraftChange(user.id, "isBlocked", e.target.checked)
                      }
                    />
                    Blokir Login
                  </label>
                </div>

                <textarea
                  className="input-dark"
                  placeholder="Alasan blokir"
                  rows={3}
                  value={statusDraft.blockedReason}
                  onChange={(e) =>
                    handleStatusDraftChange(user.id, "blockedReason", e.target.value)
                  }
                  style={{ resize: "vertical" }}
                />

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleSaveStatus(user.id)}
                  disabled={isSavingStatus}
                  style={{ width: "100%", opacity: isSavingStatus ? 0.7 : 1 }}
                >
                  {isSavingStatus ? "Menyimpan Status..." : "Simpan Status User"}
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div className="card-soft" style={{ padding: "16px" }}>
                    <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Register</div>
                    <div style={{ marginTop: "6px", fontWeight: 700 }}>
                      {formatDateTime(user.createdAt)}
                    </div>
                  </div>

                  <div className="card-soft" style={{ padding: "16px" }}>
                    <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Blocked At</div>
                    <div style={{ marginTop: "6px", fontWeight: 700 }}>
                      {formatDateTime(user.blockedAt)}
                    </div>
                  </div>

                  <div className="card-soft" style={{ padding: "16px" }}>
                    <div style={{ fontSize: "12px", color: "#9f9f9f" }}>Total Booking</div>
                    <div style={{ marginTop: "6px", fontSize: "24px", fontWeight: 900 }}>
                      {user.stats?.totalBookings || 0}
                    </div>
                  </div>

                  <div
                    className="card-soft"
                    style={{ padding: "16px", backgroundColor: "#ffffff", color: "#000000" }}
                  >
                    <div style={{ fontSize: "12px", opacity: 0.7 }}>Total Pengeluaran</div>
                    <div style={{ marginTop: "6px", fontSize: "24px", fontWeight: 900 }}>
                      {formatRupiah(user.stats?.totalSpent || 0)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}