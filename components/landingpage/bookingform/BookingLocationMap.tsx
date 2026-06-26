"use client";

import { useEffect } from "react";
import L, { type LatLngTuple } from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

const DEFAULT_CENTER: LatLngTuple = [-6.2, 106.816666];

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type BookingLocationMapProps = {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
};

function parseCoordinate(value: string, min: number, max: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) {
    return null;
  }

  return numericValue;
}

function MapViewport({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
}

function LocationMarker({
  position,
  onChange,
}: {
  position: LatLngTuple;
  onChange: (latitude: string, longitude: string) => void;
}) {
  useMapEvents({
    click(event) {
      onChange(
        event.latlng.lat.toFixed(8),
        event.latlng.lng.toFixed(8)
      );
    },
  });

  return (
    <Marker
      draggable
      icon={markerIcon}
      position={position}
      eventHandlers={{
        dragend(event) {
          const marker = event.target;
          const latLng = marker.getLatLng();
          onChange(latLng.lat.toFixed(8), latLng.lng.toFixed(8));
        },
      }}
    />
  );
}

export default function BookingLocationMap({
  latitude,
  longitude,
  onChange,
}: BookingLocationMapProps) {
  const parsedLatitude = parseCoordinate(latitude, -90, 90);
  const parsedLongitude = parseCoordinate(longitude, -180, 180);
  const hasCoordinates = parsedLatitude !== null && parsedLongitude !== null;
  const center: LatLngTuple = hasCoordinates
    ? [parsedLatitude, parsedLongitude]
    : DEFAULT_CENTER;
  const zoom = hasCoordinates ? 16 : 5;

  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
      <div className="border-b border-black/6 bg-[linear-gradient(135deg,#111111_0%,#3a3129_100%)] px-5 py-4 text-white">
        <p className="text-[13px] uppercase tracking-[0.16em] text-white/70">
          Event Location
        </p>
        <h3 className="mt-1 text-[18px]">Pilih titik acara di peta</h3>
        <p className="mt-2 text-sm text-white/75">
          Klik peta atau geser pin untuk mengisi latitude dan longitude dengan
          lebih mudah.
        </p>
      </div>

      <div className="p-4">
        <div className="h-[340px] overflow-hidden rounded-[22px] border border-black/10">
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom
            className="booking-location-map h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewport center={center} zoom={zoom} />
            <LocationMarker position={center} onChange={onChange} />
          </MapContainer>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl bg-black/[0.04] px-4 py-3 text-sm text-black/70 md:grid-cols-2">
          <div>
            <span className="block text-[12px] uppercase tracking-[0.12em] text-black/45">
              Latitude
            </span>
            <span>{latitude || "-"}</span>
          </div>
          <div>
            <span className="block text-[12px] uppercase tracking-[0.12em] text-black/45">
              Longitude
            </span>
            <span>{longitude || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
