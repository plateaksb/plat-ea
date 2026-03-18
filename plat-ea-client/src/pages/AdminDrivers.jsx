import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

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
          maxWidth: "640px",
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

const initialCreateForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  vehicleName: "",
  plateNumber: "",
  notes: "",
};

const initialEditForm = {
  id: "",
  name: "",
  phone: "",
  vehicleName: "",
  plateNumber: "",
  notes: "",
  userId: "",
};

export default function AdminDrivers() {
  const { token } = useAuth();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editForm, setEditForm] = useState(initialEditForm);

  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState("");

  async function fetchDrivers() {
    const response = await fetch(buildApiUrl("/admin/drivers"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal mengambil data driver");
    }

    setDrivers(result.data || []);
  }

  async function refreshData(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");
      await fetchDrivers();
    } catch (error) {
      setErrorMessage(error.message || "Gagal memuat data driver");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token]);

  function openCreateModal() {
    setCreateForm(initialCreateForm);
    setCreateModalOpen(true);
  }

  function openEditModal(driver) {
    setEditForm({
      id: driver.id,
      name: driver.name || "",
      phone: driver.phone || "",
      vehicleName: driver.vehicleName || "",
      plateNumber: driver.plateNumber || "",
      notes: driver.notes || "",
      userId: driver.userId || "",
    });
    setEditModalOpen(true);
  }

  function handleCreateChange(field, value) {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleEditChange(field, value) {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleCreateDriverAccount(e) {
    e.preventDefault();

    try {
      setCreating(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(buildApiUrl("/admin/drivers/create-account"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createForm),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal membuat akun driver");
      }

      setSuccessMessage("Akun driver berhasil dibuat.");
      setCreateModalOpen(false);
      setCreateForm(initialCreateForm);
      await refreshData(true);
    } catch (error) {
      setErrorMessage(error.message || "Gagal membuat akun driver");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();

    try {
      setSavingEdit(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(buildApiUrl(`/admin/drivers/${editForm.id}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone,
          vehicleName: editForm.vehicleName,
          plateNumber: editForm.plateNumber,
          notes: editForm.notes,
          userId: editForm.userId || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memperbarui driver");
      }

      setSuccessMessage("Data driver berhasil diperbarui.");
      setEditModalOpen(false);
      await refreshData(true);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memperbarui driver");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleStatus(driver) {
    try {
      setStatusLoadingId(driver.id);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(buildApiUrl(`/admin/drivers/${driver.id}/status`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !driver.isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengubah status driver");
      }

      setSuccessMessage(
        !driver.isActive
          ? "Driver berhasil diaktifkan."
          : "Driver berhasil dinonaktifkan."
      );
      await refreshData(true);
    } catch (error) {
      setErrorMessage(error.message || "Gagal mengubah status driver");
    } finally {
      setStatusLoadingId("");
    }
  }

  const filteredDrivers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const list = [...drivers].filter((driver) => {
      if (!q) return true;

      return [
        driver.name,
        driver.phone,
        driver.vehicleName,
        driver.plateNumber,
        driver.notes,
        driver.user?.email,
        driver.user?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });

    list.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return list;
  }, [drivers, searchTerm]);

  if (loading) {
    return (
      <div className="card-dark" style={{ padding: "20px" }}>
        Memuat data driver...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <div className="card-dark" style={{ padding: "18px", display: "grid", gap: "14px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 13,
                color: "#bdbdbd",
              }}
            >
              Cari Driver
            </label>
            <input
              className="input-dark"
              type="text"
              placeholder="Cari nama, email, kendaraan, plat nomor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button type="button" className="btn-secondary" onClick={() => refreshData(true)}>
            {refreshing ? "Menyegarkan..." : "Refresh"}
          </button>

          <button type="button" className="btn-primary" onClick={openCreateModal}>
            Buat Akun Driver
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

      {filteredDrivers.length === 0 ? (
        <div className="card-dark" style={{ padding: "20px" }}>
          Belum ada data driver.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {filteredDrivers.map((driver) => (
            <div
              key={driver.id}
              className="card-dark"
              style={{
                padding: "20px",
                display: "grid",
                gap: "16px",
                transition: "0.2s",
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
                  <div style={{ fontSize: "20px", fontWeight: 900 }}>{driver.name}</div>

                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "6px 10px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        backgroundColor: driver.isActive
                          ? "rgba(34,197,94,0.16)"
                          : "rgba(239,68,68,0.16)",
                        color: driver.isActive ? "#bbf7d0" : "#fecaca",
                      }}
                    >
                      {driver.isActive ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </div>

                  <div style={{ color: "#bdbdbd" }}>
                    Telepon: <strong style={{ color: "#fff" }}>{driver.phone || "-"}</strong>
                  </div>
                  <div style={{ color: "#bdbdbd" }}>
                    Kendaraan:{" "}
                    <strong style={{ color: "#fff" }}>{driver.vehicleName || "-"}</strong>
                  </div>
                  <div style={{ color: "#bdbdbd" }}>
                    Plat Nomor:{" "}
                    <strong style={{ color: "#fff" }}>{driver.plateNumber || "-"}</strong>
                  </div>
                </div>

                <div style={{ textAlign: "right", display: "grid", gap: "8px" }}>
                  <div style={{ color: "#9f9f9f", fontSize: "13px" }}>Akun Login</div>
                  <div style={{ fontWeight: 800 }}>{driver.user?.email || "-"}</div>
                  <div style={{ color: "#bdbdbd" }}>
                    Role: <strong style={{ color: "#fff" }}>{driver.user?.role || "-"}</strong>
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
                  className="card-dark"
                  style={{
                    padding: "14px",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f", marginBottom: 8 }}>
                    Informasi Driver
                  </div>
                  <div>ID Driver: {driver.id}</div>
                  <div>User ID: {driver.userId || "-"}</div>
                  <div>Catatan: {driver.notes || "-"}</div>
                </div>

                <div
                  className="card-dark"
                  style={{
                    padding: "14px",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9f9f9f", marginBottom: 8 }}>
                    Metadata
                  </div>
                  <div>
                    Dibuat:{" "}
                    {driver.createdAt
                      ? new Date(driver.createdAt).toLocaleString("id-ID")
                      : "-"}
                  </div>
                  <div>
                    Diperbarui:{" "}
                    {driver.updatedAt
                      ? new Date(driver.updatedAt).toLocaleString("id-ID")
                      : "-"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => openEditModal(driver)}
                >
                  Edit Driver
                </button>

                <button
                  type="button"
                  className={driver.isActive ? "btn-secondary" : "btn-primary"}
                  disabled={statusLoadingId === driver.id}
                  onClick={() => handleToggleStatus(driver)}
                >
                  {statusLoadingId === driver.id
                    ? "Menyimpan..."
                    : driver.isActive
                    ? "Nonaktifkan"
                    : "Aktifkan"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={createModalOpen}
        title="Buat Akun Driver"
        onClose={() => setCreateModalOpen(false)}
      >
        <form onSubmit={handleCreateDriverAccount} style={{ display: "grid", gap: "14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                Nama Driver
              </label>
              <input
                className="input-dark"
                value={createForm.name}
                onChange={(e) => handleCreateChange("name", e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                No. HP
              </label>
              <input
                className="input-dark"
                value={createForm.phone}
                onChange={(e) => handleCreateChange("phone", e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                Email Login
              </label>
              <input
                type="email"
                className="input-dark"
                value={createForm.email}
                onChange={(e) => handleCreateChange("email", e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                Password
              </label>
              <input
                type="password"
                className="input-dark"
                value={createForm.password}
                onChange={(e) => handleCreateChange("password", e.target.value)}
                required
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                Nama Kendaraan
              </label>
              <input
                className="input-dark"
                value={createForm.vehicleName}
                onChange={(e) => handleCreateChange("vehicleName", e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                Plat Nomor
              </label>
              <input
                className="input-dark"
                value={createForm.plateNumber}
                onChange={(e) => handleCreateChange("plateNumber", e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
              Catatan
            </label>
            <textarea
              className="input-dark"
              rows={3}
              value={createForm.notes}
              onChange={(e) => handleCreateChange("notes", e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCreateModalOpen(false)}
            >
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? "Membuat akun..." : "Buat Akun Driver"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editModalOpen}
        title="Edit Driver"
        onClose={() => setEditModalOpen(false)}
      >
        <form onSubmit={handleSaveEdit} style={{ display: "grid", gap: "14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                Nama Driver
              </label>
              <input
                className="input-dark"
                value={editForm.name}
                onChange={(e) => handleEditChange("name", e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                No. HP
              </label>
              <input
                className="input-dark"
                value={editForm.phone}
                onChange={(e) => handleEditChange("phone", e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                Nama Kendaraan
              </label>
              <input
                className="input-dark"
                value={editForm.vehicleName}
                onChange={(e) => handleEditChange("vehicleName", e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
                Plat Nomor
              </label>
              <input
                className="input-dark"
                value={editForm.plateNumber}
                onChange={(e) => handleEditChange("plateNumber", e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#bdbdbd" }}>
              Catatan
            </label>
            <textarea
              className="input-dark"
              rows={3}
              value={editForm.notes}
              onChange={(e) => handleEditChange("notes", e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditModalOpen(false)}
            >
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={savingEdit}>
              {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}