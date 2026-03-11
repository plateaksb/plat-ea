import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../lib/api";

export default function AdminPricing() {
  const { token } = useAuth();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");

  async function fetchPricing() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(buildApiUrl("/pricing"));
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil data tarif");
      }

      setPricing(result.data);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat tarif");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPricing();
  }, []);

  function handleInputChange(section, key, field, value) {
    setPricing((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: {
          ...prev[section][key],
          [field]: field === "label" ? value : Number(value),
        },
      },
    }));
  }

  async function handleSave(section, key) {
    try {
      setSavingKey(`${section}-${key}`);
      setErrorMessage("");
      setSuccessMessage("");

      const values = pricing[section][key];

      const response = await fetch(buildApiUrl("/pricing"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section,
          key,
          values,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menyimpan tarif");
      }

      setPricing(result.data);
      setSuccessMessage(`Tarif ${values.label} berhasil diperbarui.`);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat menyimpan tarif");
    } finally {
      setSavingKey("");
    }
  }

  function renderEditor(section, key, item) {
    const isSaving = savingKey === `${section}-${key}`;

    return (
      <div
        key={key}
        className="card-dark"
        style={{ padding: "20px", display: "grid", gap: "12px" }}
      >
        <div style={{ fontSize: "22px", fontWeight: 800 }}>{item.label}</div>

        <div style={{ display: "grid", gap: "10px" }}>
          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            Nama Layanan
            <input
              className="input-dark"
              value={item.label}
              onChange={(e) =>
                handleInputChange(section, key, "label", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>

          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            Tarif Dasar
            <input
              type="number"
              className="input-dark"
              value={item.baseFare}
              onChange={(e) =>
                handleInputChange(section, key, "baseFare", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>

          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            Tarif per Km
            <input
              type="number"
              className="input-dark"
              value={item.perKm}
              onChange={(e) =>
                handleInputChange(section, key, "perKm", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>

          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            Minimum Tarif
            <input
              type="number"
              className="input-dark"
              value={item.minimumFare}
              onChange={(e) =>
                handleInputChange(section, key, "minimumFare", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>

          <label style={{ fontSize: "14px", color: "#cfcfcf" }}>
            ETA Dasar
            <input
              type="number"
              className="input-dark"
              value={item.etaBase}
              onChange={(e) =>
                handleInputChange(section, key, "etaBase", e.target.value)
              }
              style={{ marginTop: "6px" }}
            />
          </label>
        </div>

        <button
          className="btn-primary"
          onClick={() => handleSave(section, key)}
          disabled={isSaving}
          style={{ width: "100%", opacity: isSaving ? 0.7 : 1 }}
          type="button"
        >
          {isSaving ? "Menyimpan..." : "Simpan Tarif"}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card-dark" style={{ padding: "20px" }}>
        Memuat tarif...
      </div>
    );
  }

  return (
    <section>
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
            marginBottom: "20px",
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
            marginBottom: "20px",
          }}
        >
          {successMessage}
        </div>
      )}

      {pricing && (
        <>
          <section style={{ marginBottom: "40px" }}>
            <h2 style={{ marginBottom: "16px" }}>Edit Tarif Taksi</h2>
            <div className="grid-3">
              {Object.entries(pricing.taxiTypes).map(([key, item]) =>
                renderEditor("taxiTypes", key, item)
              )}
            </div>
          </section>

          <section style={{ marginBottom: "40px" }}>
            <h2 style={{ marginBottom: "16px" }}>Edit Tarif Layanan Lain</h2>
            <div className="grid-2">
              {Object.entries(pricing.services).map(([key, item]) =>
                renderEditor("services", key, item)
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}