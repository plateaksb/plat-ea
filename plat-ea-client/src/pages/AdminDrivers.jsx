import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

const emptyNewDriver = {
  name: "",
  phone: "",
  vehicleName: "",
  plateNumber: "",
  notes: "",
};

export default function AdminDrivers() {
  const { token } = useAuth();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [drafts, setDrafts] = useState({});
  const [creating, setCreating] = useState(false);
  const [savingDriverId, setSavingDriverId] = useState("");
  const [savingStatusId, setSavingStatusId] = useState("");
  const [newDriver, setNewDriver] = useState(emptyNewDriver);

  async function fetchDrivers(showMainLoader = false) {
    try {
      if (showMainLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(buildApiUrl("/admin/drivers"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil daftar driver");
      }

      setDrivers(result.data);

      const nextDrafts = {};
      for (const driver of result.data) {
        nextDrafts[driver.id] = {
          name: driver.name || "",
          phone: driver.phone || "",
          vehicleName: driver.vehicleName || "",
          plateNumber: driver.plateNumber || "",
          notes: driver.notes || "",
          isActive: Boolean(driver.isActive),
        };
      }
      setDrafts(nextDrafts);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat driver");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (token) {
      fetchDrivers(true);
    }
  }, [token]);

  function handleDraftChange(driverId, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [driverId]: {
        ...prev[driverId],
        [field]: value,
      },
    }));
  }

  async function handleCreateDriver() {
    try {
      setCreating(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(buildApiUrl("/admin/drivers"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newDriver),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menambahkan driver");
      }

      setSuccessMessage("Driver berhasil ditambahkan.");
      setNewDriver(emptyNewDriver);
      await fetchDrivers(false);
    } catch (error) {
      setErrorMessage(error.message || "Gagal menambahkan driver");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveDriver(driverId) {
    try {
      setSavingDriverId(driverId);
      setErrorMessage("");
      setSuccessMessage("");

      const draft = drafts[driverId];

      const response = await fetch(buildApiUrl(`/admin/drivers/${driverId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone,
          vehicleName: draft.vehicleName,
          plateNumber: draft.plateNumber,
          notes: draft.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui driver");
      }

      setSuccessMessage("Driver berhasil diperbarui.");
      await fetchDrivers(false);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memperbarui driver");
    } finally {
      setSavingDriverId("");
    }
  }

  async function handleSaveStatus(driverId) {
    try {
      setSavingStatusId(driverId);
      setErrorMessage("");
      setSuccessMessage("");

      const draft = drafts[driverId];

      const response = await fetch(
        buildApiUrl(`/admin/drivers/${driverId}/status`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: Boolean(draft.isActive),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui status driver");
      }

      setSuccessMessage("Status driver berhasil diperbarui.");
      await fetchDrivers(false);
    } catch (error) {
      setErrorMessage(error.message || "Gagal memperbarui status driver");
    } finally {
      setSavingStatusId("");
    }
  }

  const filteredDrivers = useMemo(() => {
    let result = drivers;

    if (statusFilter === "ACTIVE") {
      result = result.filter((driver) => driver.isActive);
    } else if (statusFilter === "INACTIVE") {
      result = result.filter((driver) => !driver.isActive);
    }

    const keyword = searchTerm.trim().toLowerCase();

    if (keyword) {
      result = result.filter((driver) => {
        const haystack = [
          driver.name,
          driver.phone,
          driver.vehicleName,
          driver.plateNumber,
          driver.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(keyword);
      });
    }

    return result;
  }, [drivers, statusFilter, searchTerm]);

  const summary = useMemo(() => {
    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter((driver) => driver.isActive).length;
    const inactiveDrivers = drivers.filter((driver) => !driver.isActive).length;

    return {
      totalDrivers,
      activeDrivers,
      inactiveDrivers,
    };
  }, [drivers]);

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
            Kelola Driver
          </h2>
          <p style={{ margin: 0, color: "#bdbdbd", lineHeight: 1.7 }}>
            Data master driver terpisah agar admin tidak mengetik ulang driver
            untuk setiap booking.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => fetchDrivers(false)}
          disabled={refreshing}
        >
          {refreshing ? "Memperbarui..." : "Refresh"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="card-dark" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>Total Driver</div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.totalDrivers}
          </div>
        </div>

        <div className="card-dark" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>Driver Aktif</div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.activeDrivers}
          </div>
        </div>

        <div className="card-dark" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", color: "#9f9f9f" }}>
            Driver Nonaktif
          </div>
          <div style={{ marginTop: "10px", fontSize: "30px", fontWeight: 900 }}>
            {summary.inactiveDrivers}
          </div>
        </div>
      </div>

      <div
        className="card-dark"
        style={{ padding: "20px", display: "grid", gap: "14px" }}
      >
        <div style={{ fontSize: "18px", fontWeight: 800 }}>
          Tambah Driver Baru
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <input
            className="input-dark"
            placeholder="Nama driver"
            value={newDriver.name}
            onChange={(e) =>
              setNewDriver((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <input
            className="input-dark"
            placeholder="No. HP"
            value={newDriver.phone}
            onChange={(e) =>
              setNewDriver((prev) => ({ ...prev, phone: e.target.value }))
            }
          />
          <input
            className="input-dark"
            placeholder="Nama kendaraan"
            value={newDriver.vehicleName}
            onChange={(e) =>
              setNewDriver((prev) => ({ ...prev, vehicleName: e.target.value }))
            }
          />
          <input
            className="input-dark"
            placeholder="Plat nomor"
            value={newDriver.plateNumber}
            onChange={(e) =>
              setNewDriver((prev) => ({
                ...prev,
                plateNumber: e.target.value.toUpperCase(),
              }))
            }
          />
        </div>

        <textarea
          className="input-dark"
          rows={3}
          placeholder="Catatan driver"
          value={newDriver.notes}
          onChange={(e) =>
            setNewDriver((prev) => ({ ...prev, notes: e.target.value }))
          }
          style={{ resize: "vertical" }}
        />

        <button
          type="button"
          className="btn-primary"
          onClick={handleCreateDriver}
          disabled={creating}
          style={{ width: "100%", opacity: creating ? 0.7 : 1 }}
        >
          {creating ? "Menyimpan..." : "Tambah Driver"}
        </button>
      </div>

      <div
        className="card-dark"
        style={{ padding: "18px", display: "grid", gap: "14px" }}
      >
        <div style={{ fontWeight: 800, fontSize: "15px" }}>Filter Driver</div>

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
            placeholder="Cari nama, no hp, kendaraan, plat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="select-dark"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
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
          Memuat data driver...
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="card-dark" style={{ padding: "20px" }}>
          Tidak ada data driver.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {filteredDrivers.map((driver) => {
            const draft = drafts[driver.id] || {
              name: "",
              phone: "",
              vehicleName: "",
              plateNumber: "",
              notes: "",
              isActive: true,
            };

            const isSavingDriver = savingDriverId === driver.id;
            const isSavingStatus = savingStatusId === driver.id;

            return (
              <div
                key={driver.id}
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
                      {driver.name}
                    </div>
                    <div
                      style={{
                        marginTop: "6px",
                        color: "#9f9f9f",
                        fontSize: "13px",
                      }}
                    >
                      ID: {driver.id}
                    </div>
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "8px 12px",
                      borderRadius: "999px",
                      backgroundColor: driver.isActive
                        ? "rgba(34,197,94,0.16)"
                        : "rgba(239,68,68,0.16)",
                      color: driver.isActive ? "#bbf7d0" : "#fecaca",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {driver.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <input
                    className="input-dark"
                    placeholder="Nama driver"
                    value={draft.name}
                    onChange={(e) =>
                      handleDraftChange(driver.id, "name", e.target.value)
                    }
                  />
                  <input
                    className="input-dark"
                    placeholder="No. HP"
                    value={draft.phone}
                    onChange={(e) =>
                      handleDraftChange(driver.id, "phone", e.target.value)
                    }
                  />
                  <input
                    className="input-dark"
                    placeholder="Nama kendaraan"
                    value={draft.vehicleName}
                    onChange={(e) =>
                      handleDraftChange(driver.id, "vehicleName", e.target.value)
                    }
                  />
                  <input
                    className="input-dark"
                    placeholder="Plat nomor"
                    value={draft.plateNumber}
                    onChange={(e) =>
                      handleDraftChange(
                        driver.id,
                        "plateNumber",
                        e.target.value.toUpperCase()
                      )
                    }
                  />
                </div>

                <textarea
                  className="input-dark"
                  rows={3}
                  placeholder="Catatan"
                  value={draft.notes}
                  onChange={(e) =>
                    handleDraftChange(driver.id, "notes", e.target.value)
                  }
                  style={{ resize: "vertical" }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
                      checked={Boolean(draft.isActive)}
                      onChange={(e) =>
                        handleDraftChange(driver.id, "isActive", e.target.checked)
                      }
                    />
                    Driver Aktif
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleSaveDriver(driver.id)}
                    disabled={isSavingDriver}
                    style={{ width: "100%", opacity: isSavingDriver ? 0.7 : 1 }}
                  >
                    {isSavingDriver ? "Menyimpan..." : "Simpan Driver"}
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleSaveStatus(driver.id)}
                    disabled={isSavingStatus}
                    style={{ width: "100%", opacity: isSavingStatus ? 0.7 : 1 }}
                  >
                    {isSavingStatus ? "Menyimpan..." : "Simpan Status"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}