import "server-only";

import { type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import { calculateDistanceKm, calculateTransportFee } from "@/lib/distance";
import { ensurePartnerCmsSchema } from "@/lib/partner-cms";

type BookingPricingRow = RowDataPacket & {
  photographer_user_id: number;
  brand_name: string;
  photographer_address: string;
  latitude: number | null;
  longitude: number | null;
  free_distance_km: number;
  transport_fee_per_km: number;
  package_id: number;
  package_name: string;
  package_price: number;
};

export class BookingPricingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "BookingPricingError";
    this.status = status;
  }
}

export type BookingQuoteInput = {
  photographerUserId: number;
  packageId: number;
  eventAddress: string;
  eventLatitude: number;
  eventLongitude: number;
};

export type BookingQuote = {
  photographerUserId: number;
  brandName: string;
  photographerAddress: string;
  eventAddress: string;
  eventLatitude: number;
  eventLongitude: number;
  packageId: number;
  packageName: string;
  packagePrice: number;
  distanceKm: number;
  freeDistanceKm: number;
  transportFeePerKm: number;
  transportFee: number;
  totalPrice: number;
  amount: number;
};

function ensureCoordinateRange(
  value: number,
  min: number,
  max: number,
  label: string
) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new BookingPricingError(`${label} tidak valid.`, 400);
  }
}

export async function getBookingQuote(input: BookingQuoteInput) {
  const eventAddress = input.eventAddress.trim();

  if (!eventAddress) {
    throw new BookingPricingError("Alamat acara wajib diisi.", 400);
  }

  if (
    !Number.isInteger(input.photographerUserId) ||
    input.photographerUserId <= 0
  ) {
    throw new BookingPricingError("Fotografer tidak valid.", 400);
  }

  if (!Number.isInteger(input.packageId) || input.packageId <= 0) {
    throw new BookingPricingError("Paket tidak valid.", 400);
  }

  ensureCoordinateRange(input.eventLatitude, -90, 90, "Latitude acara");
  ensureCoordinateRange(input.eventLongitude, -180, 180, "Longitude acara");

  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<BookingPricingRow[]>(
    `
      SELECT
        p.user_id AS photographer_user_id,
        COALESCE(NULLIF(p.brand_name, ''), u.name) AS brand_name,
        p.address AS photographer_address,
        p.latitude,
        p.longitude,
        p.free_distance_km,
        p.transport_fee_per_km,
        pkg.id AS package_id,
        pkg.name AS package_name,
        pkg.price AS package_price
      FROM partner_profiles p
      INNER JOIN users u ON u.id = p.user_id
      INNER JOIN partner_packages pkg
        ON pkg.user_id = p.user_id
      WHERE u.role = 'admin'
        AND p.user_id = ?
        AND pkg.id = ?
      LIMIT 1
    `,
    [input.photographerUserId, input.packageId]
  );

  const row = rows[0];

  if (!row) {
    throw new BookingPricingError(
      "Paket atau fotografer yang dipilih tidak ditemukan.",
      404
    );
  }

  if (row.latitude === null || row.longitude === null) {
    throw new BookingPricingError(
      "Lokasi fotografer belum diatur. Silakan hubungi mitra terlebih dahulu.",
      400
    );
  }

  const distanceKm = calculateDistanceKm(
    Number(row.latitude),
    Number(row.longitude),
    input.eventLatitude,
    input.eventLongitude
  );
  const freeDistanceKm = Number(row.free_distance_km ?? 5);
  const transportFeePerKm = Number(row.transport_fee_per_km ?? 3000);
  const packagePrice = Number(row.package_price ?? 0);
  const transportFee = calculateTransportFee(
    distanceKm,
    freeDistanceKm,
    transportFeePerKm
  );
  const totalPrice = packagePrice + transportFee;

  return {
    photographerUserId: row.photographer_user_id,
    brandName: row.brand_name,
    photographerAddress: row.photographer_address,
    eventAddress,
    eventLatitude: input.eventLatitude,
    eventLongitude: input.eventLongitude,
    packageId: row.package_id,
    packageName: row.package_name,
    packagePrice,
    distanceKm,
    freeDistanceKm,
    transportFeePerKm,
    transportFee,
    totalPrice,
    amount: totalPrice,
  } satisfies BookingQuote;
}
