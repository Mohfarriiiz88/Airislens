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

const DEFAULT_CENTER: LatLngTuple = [-6.8694, 109.1402];

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
  disabled?: boolean;
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
    map.flyTo(center, zoom, {
      animate: true,
      duration: 0.8,
    });
  }, [center, map, zoom]);

  return null;
}

function LocationMarker({
  disabled = false,
  position,
  onChange,
}: {
  disabled?: boolean;
  position: LatLngTuple;
  onChange: (latitude: string, longitude: string) => void;
}) {
  useMapEvents({
    click(event) {
      if (disabled) {
        return;
      }

      onChange(event.latlng.lat.toFixed(8), event.latlng.lng.toFixed(8));
    },
  });

  return (
    <Marker
      draggable={!disabled}
      icon={markerIcon}
      position={position}
      eventHandlers={{
        dragend(event) {
          if (disabled) {
            return;
          }

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
  disabled = false,
  onChange,
}: BookingLocationMapProps) {
  const parsedLatitude = parseCoordinate(latitude, -90, 90);
  const parsedLongitude = parseCoordinate(longitude, -180, 180);
  const hasCoordinates = parsedLatitude !== null && parsedLongitude !== null;
  const center: LatLngTuple = hasCoordinates
    ? [parsedLatitude, parsedLongitude]
    : DEFAULT_CENTER;
  const zoom = hasCoordinates ? 16 : 12;

  return (
    <div className="overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
      <div className="border-b border-black/8 bg-white px-5 py-4 text-black md:px-6">
        <p className="text-[12px] uppercase tracking-[0.18em] text-black/45">
          Titik Lokasi
        </p>
        <h3 className="mt-2 text-[20px] leading-tight text-black md:text-[24px]">
          Pilih titik acara langsung dari peta
        </h3>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-black/62 md:text-[15px]">
          Anda juga dapat menentukan titik lokasi langsung melalui peta.
          Tekan area yang diinginkan atau geser pin untuk memperbarui koordinat.
        </p>
      </div>

      <div className="p-4 md:p-5">
        <div className="h-[360px] overflow-hidden rounded-[24px] border border-black/10 md:h-[420px]">
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={!disabled}
            dragging={!disabled}
            doubleClickZoom={!disabled}
            className="booking-location-map h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewport center={center} zoom={zoom} />
            <LocationMarker
              disabled={disabled}
              position={center}
              onChange={onChange}
            />
          </MapContainer>
        </div>

        <div className="mt-4 grid gap-3 rounded-[22px] bg-black/[0.035] px-4 py-4 text-[14px] text-black/72 md:grid-cols-2 md:px-5">
          <div>
            <span className="block text-[11px] uppercase tracking-[0.16em] text-black/45">
              Latitude
            </span>
            <span className="mt-1 block text-[15px] text-black">
              {latitude || "-"}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-[0.16em] text-black/45">
              Longitude
            </span>
            <span className="mt-1 block text-[15px] text-black">
              {longitude || "-"}
            </span>
          </div>
        </div>

        {!hasCoordinates ? (
          <p className="mt-4 text-[14px] leading-6 text-black/58">
            Peta dibuka dengan pusat awal di area Tegal untuk memudahkan orientasi.
            Koordinat booking baru akan tersimpan setelah Anda memilih lokasi.
          </p>
        ) : null}
      </div>
    </div>
  );
}
