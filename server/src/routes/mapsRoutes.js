const express = require("express");

const router = express.Router();

router.post("/route", async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (
      !origin?.lat ||
      !origin?.lng ||
      !destination?.lat ||
      !destination?.lng
    ) {
      return res.status(400).json({
        success: false,
        message: "Origin dan destination wajib valid",
      });
    }

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_SERVER_API_KEY,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng,
              },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: result.error?.message || "Gagal menghitung rute",
      });
    }

    const route = result.routes?.[0];

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Rute tidak ditemukan",
      });
    }

    const distanceKm = Number((route.distanceMeters / 1000).toFixed(1));
    const durationSeconds = Number(
      String(route.duration || "0s").replace("s", "")
    );
    const durationMinutes = Math.ceil(durationSeconds / 60);

    res.json({
      success: true,
      data: {
        distanceKm,
        durationMinutes,
        polyline: route.polyline?.encodedPolyline || "",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghitung rute live",
    });
  }
});

router.post("/reverse-geocode", async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({
        success: false,
        message: "Latitude dan longitude wajib valid",
      });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=id&key=${process.env.GOOGLE_MAPS_SERVER_API_KEY}`
    );

    const result = await response.json();

    if (!response.ok || result.status !== "OK") {
      return res.status(400).json({
        success: false,
        message: result.error_message || "Gagal membaca alamat dari koordinat",
      });
    }

    const item = result.results?.[0];

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Alamat tidak ditemukan untuk koordinat ini",
      });
    }

    res.json({
      success: true,
      data: {
        placeId: item.place_id || "",
        name: item.formatted_address || "Lokasi Saat Ini",
        address: item.formatted_address || `${lat}, ${lng}`,
        lat,
        lng,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat reverse geocoding",
    });
  }
});

module.exports = router;