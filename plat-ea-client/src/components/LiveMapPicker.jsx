import { useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  version: "weekly",
  libraries: ["places", "geometry"],
});

function createMarkerIcon(color) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 9,
  };
}

export default function LiveMapPicker({
  pickup,
  destination,
  activePoint = "pickup",
  routePolyline,
  onPickupSelect,
  onDestinationSelect,
}) {
  const mapRef = useRef(null);
  const pickupInputRef = useRef(null);
  const destinationInputRef = useRef(null);

  const mapInstanceRef = useRef(null);
  const geocoderRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  const pickupAutocompleteRef = useRef(null);
  const destinationAutocompleteRef = useRef(null);
  const mapClickListenerRef = useRef(null);

  const onPickupSelectRef = useRef(onPickupSelect);
  const onDestinationSelectRef = useRef(onDestinationSelect);
  const activePointRef = useRef(activePoint);

  useEffect(() => {
    onPickupSelectRef.current = onPickupSelect;
  }, [onPickupSelect]);

  useEffect(() => {
    onDestinationSelectRef.current = onDestinationSelect;
  }, [onDestinationSelect]);

  useEffect(() => {
    activePointRef.current = activePoint;
  }, [activePoint]);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      const { Map } = await importLibrary("maps");
      await importLibrary("places");
      await importLibrary("geometry");

      if (!isMounted || mapInstanceRef.current) return;

      const map = new Map(mapRef.current, {
        center: { lat: -8.65, lng: 117.37 },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapInstanceRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();

      pickupAutocompleteRef.current = new google.maps.places.Autocomplete(
        pickupInputRef.current,
        {
          componentRestrictions: { country: "id" },
          fields: ["formatted_address", "geometry", "name", "place_id"],
        }
      );

      destinationAutocompleteRef.current = new google.maps.places.Autocomplete(
        destinationInputRef.current,
        {
          componentRestrictions: { country: "id" },
          fields: ["formatted_address", "geometry", "name", "place_id"],
        }
      );

      pickupAutocompleteRef.current.addListener("place_changed", () => {
        const place = pickupAutocompleteRef.current.getPlace();
        if (!place.geometry?.location) return;

        const payload = {
          placeId: place.place_id || "",
          name: place.name || "",
          address: place.formatted_address || "",
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        onPickupSelectRef.current(payload);

        if (pickupMarkerRef.current) {
          pickupMarkerRef.current.setMap(null);
        }

        pickupMarkerRef.current = new google.maps.Marker({
          map,
          position: { lat: payload.lat, lng: payload.lng },
          title: "Pickup",
          icon: createMarkerIcon("#16a34a"),
        });

        fitMap(
          map,
          pickupMarkerRef.current,
          destinationMarkerRef.current,
          routeLineRef.current
        );
      });

      destinationAutocompleteRef.current.addListener("place_changed", () => {
        const place = destinationAutocompleteRef.current.getPlace();
        if (!place.geometry?.location) return;

        const payload = {
          placeId: place.place_id || "",
          name: place.name || "",
          address: place.formatted_address || "",
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        onDestinationSelectRef.current(payload);

        if (destinationMarkerRef.current) {
          destinationMarkerRef.current.setMap(null);
        }

        destinationMarkerRef.current = new google.maps.Marker({
          map,
          position: { lat: payload.lat, lng: payload.lng },
          title: "Destination",
          icon: createMarkerIcon("#dc2626"),
        });

        fitMap(
          map,
          pickupMarkerRef.current,
          destinationMarkerRef.current,
          routeLineRef.current
        );
      });

      mapClickListenerRef.current = map.addListener("click", async (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        try {
          const geocoder = geocoderRef.current;
          const response = await geocoder.geocode({
            location: { lat, lng },
          });

          const result = response.results?.[0];

          const payload = {
            placeId: result?.place_id || "",
            name: result?.formatted_address || "Lokasi dipilih dari peta",
            address: result?.formatted_address || `${lat}, ${lng}`,
            lat,
            lng,
          };

          if (activePointRef.current === "pickup") {
            onPickupSelectRef.current(payload);

            if (pickupInputRef.current) {
              pickupInputRef.current.value = payload.address;
            }

            if (pickupMarkerRef.current) {
              pickupMarkerRef.current.setMap(null);
            }

            pickupMarkerRef.current = new google.maps.Marker({
              map,
              position: { lat, lng },
              title: "Pickup",
              icon: createMarkerIcon("#16a34a"),
            });
          } else {
            onDestinationSelectRef.current(payload);

            if (destinationInputRef.current) {
              destinationInputRef.current.value = payload.address;
            }

            if (destinationMarkerRef.current) {
              destinationMarkerRef.current.setMap(null);
            }

            destinationMarkerRef.current = new google.maps.Marker({
              map,
              position: { lat, lng },
              title: "Destination",
              icon: createMarkerIcon("#dc2626"),
            });
          }

          fitMap(
            map,
            pickupMarkerRef.current,
            destinationMarkerRef.current,
            routeLineRef.current
          );
        } catch (error) {
          console.error("Geocoder error:", error);
        }
      });
    }

    initMap().catch((error) => {
      console.error("Google Maps init error:", error);
    });

    return () => {
      isMounted = false;

      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickupInputRef.current) {
      pickupInputRef.current.value = pickup?.address || "";
    }

    if (!pickup) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setMap(null);
        pickupMarkerRef.current = null;
      }

      fitMap(
        map,
        pickupMarkerRef.current,
        destinationMarkerRef.current,
        routeLineRef.current
      );
      return;
    }

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setMap(null);
    }

    pickupMarkerRef.current = new google.maps.Marker({
      map,
      position: { lat: pickup.lat, lng: pickup.lng },
      title: "Pickup",
      icon: createMarkerIcon("#16a34a"),
    });

    fitMap(
      map,
      pickupMarkerRef.current,
      destinationMarkerRef.current,
      routeLineRef.current
    );
  }, [pickup]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (destinationInputRef.current) {
      destinationInputRef.current.value = destination?.address || "";
    }

    if (!destination) {
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
        destinationMarkerRef.current = null;
      }

      fitMap(
        map,
        pickupMarkerRef.current,
        destinationMarkerRef.current,
        routeLineRef.current
      );
      return;
    }

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null);
    }

    destinationMarkerRef.current = new google.maps.Marker({
      map,
      position: { lat: destination.lat, lng: destination.lng },
      title: "Destination",
      icon: createMarkerIcon("#dc2626"),
    });

    fitMap(
      map,
      pickupMarkerRef.current,
      destinationMarkerRef.current,
      routeLineRef.current
    );
  }, [destination]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }

    if (!routePolyline) {
      fitMap(map, pickupMarkerRef.current, destinationMarkerRef.current, null);
      return;
    }

    const decodedPath = google.maps.geometry.encoding.decodePath(routePolyline);

    routeLineRef.current = new google.maps.Polyline({
      path: decodedPath,
      geodesic: true,
      strokeColor: "#16a34a",
      strokeOpacity: 0.95,
      strokeWeight: 6,
      map,
    });

    fitMap(
      map,
      pickupMarkerRef.current,
      destinationMarkerRef.current,
      routeLineRef.current
    );
  }, [routePolyline]);

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div
        style={{
          fontSize: "13px",
          color: "#bdbdbd",
          lineHeight: 1.6,
          padding: "10px 14px",
          borderRadius: "12px",
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        Klik map untuk memilih{" "}
        <strong>
          {activePoint === "pickup" ? "titik jemput" : "titik tujuan"}
        </strong>
        . Kamu juga bisa mengetik lokasi dan memilih dari suggestion Google
        Maps.
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          fontSize: "13px",
          color: "#cfcfcf",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "999px",
              backgroundColor: "#16a34a",
              display: "inline-block",
              border: "2px solid #ffffff",
            }}
          />
          Pickup
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "999px",
              backgroundColor: "#dc2626",
              display: "inline-block",
              border: "2px solid #ffffff",
            }}
          />
          Tujuan
        </div>
      </div>

      <input
        ref={pickupInputRef}
        defaultValue={pickup?.address || ""}
        className="input-dark"
        placeholder="Cari titik jemput"
      />

      <input
        ref={destinationInputRef}
        defaultValue={destination?.address || ""}
        className="input-dark"
        placeholder="Cari tujuan"
      />

      <div
        style={{
          fontSize: "13px",
          color: "#9f9f9f",
          lineHeight: 1.6,
        }}
      >
        Pickup: {pickup?.address || "-"}
        <br />
        Tujuan: {destination?.address || "-"}
      </div>

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "380px",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}

function fitMap(map, pickupMarker, destinationMarker, routeLine) {
  const bounds = new google.maps.LatLngBounds();

  if (pickupMarker?.getPosition()) {
    bounds.extend(pickupMarker.getPosition());
  }

  if (destinationMarker?.getPosition()) {
    bounds.extend(destinationMarker.getPosition());
  }

  if (routeLine?.getPath) {
    routeLine.getPath().forEach((point) => bounds.extend(point));
  }

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, 80);
  }
}