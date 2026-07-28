import "server-only";

import { type RowDataPacket } from "mysql2/promise";

import { parsePackageDurationToMinutes } from "@/lib/booking-time";
import { getDbPool } from "@/lib/db";
import { calculateDistanceKm, calculateTransportFee } from "@/lib/distance";
import { ensurePartnerCmsSchema } from "@/lib/partner-cms";
import { calculateBookingTotals } from "@/lib/service-fee";

type BookingPricingRow = RowDataPacket & {
  photographer_user_id: number;
  brand_name: string;
  photographer_address: string;
  latitude: number | null;
  longitude: number | null;
  free_distance_km: number;
  flat_transport_fee: number;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  package_id: number;
  package_name: string;
  package_duration: string;
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
  categoryId?: number | null;
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
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  packageId: number;
  packageName: string;
  packageDuration: string;
  packageDurationMinutes: number;
  packagePrice: number;
  distanceKm: number;
  freeDistanceKm: number;
  flatTransportFee: number;
  transportFee: number;
  serviceFeeRate: number;
  serviceFee: number;
  photographerPayoutAmount: number;
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

  if (
    input.categoryId !== undefined &&
    input.categoryId !== null &&
    (!Number.isInteger(input.categoryId) || input.categoryId <= 0)
  ) {
    throw new BookingPricingError("Kategori layanan tidak valid.", 400);
  }

  ensureCoordinateRange(input.eventLatitude, -90, 90, "Latitude acara");
  ensureCoordinateRange(input.eventLongitude, -180, 180, "Longitude acara");

  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const params: number[] = [input.photographerUserId, input.packageId];
  let categoryClause = "";

  if (
    typeof input.categoryId === "number" &&
    Number.isInteger(input.categoryId) &&
    input.categoryId > 0
  ) {
    categoryClause = "AND pkg.category_id = ?";
    params.push(input.categoryId);
  }

  const [rows] = await pool.execute<BookingPricingRow[]>(
    `
      SELECT
        p.user_id AS photographer_user_id,
        COALESCE(NULLIF(p.brand_name, ''), u.name) AS brand_name,
        p.address AS photographer_address,
        p.latitude,
        p.longitude,
        p.free_distance_km,
        p.flat_transport_fee,
        pkg.category_id,
        cat.name AS category_name,
        cat.slug AS category_slug,
        pkg.id AS package_id,
        pkg.name AS package_name,
        pkg.duration AS package_duration,
        pkg.price AS package_price
      FROM partner_profiles p
      INNER JOIN users u ON u.id = p.user_id
      INNER JOIN partner_packages pkg
        ON pkg.user_id = p.user_id
      LEFT JOIN partner_categories cat
        ON cat.id = pkg.category_id
       AND cat.user_id = p.user_id
      WHERE u.role = 'admin'
        AND p.user_id = ?
        AND pkg.id = ?
        ${categoryClause}
      LIMIT 1
    `,
    params
  );

  const row = rows[0];

  if (!row) {
    throw new BookingPricingError(
      "Paket atau fotografer yang dipilih tidak ditemukan.",
      404
    );
  }

  if (
    typeof input.categoryId === "number" &&
    input.categoryId > 0 &&
    row.category_id !== null &&
    Number(row.category_id) !== input.categoryId
  ) {
    throw new BookingPricingError(
      "Kategori layanan tidak cocok dengan paket yang dipilih.",
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
  const flatTransportFee = Number(row.flat_transport_fee ?? 0);
  const packagePrice = Number(row.package_price ?? 0);
  const packageDuration = row.package_duration?.trim() ?? "";
  let packageDurationMinutes: number;

  try {
    packageDurationMinutes = parsePackageDurationToMinutes(packageDuration);
  } catch (error) {
    throw new BookingPricingError(
      error instanceof Error
        ? `Durasi paket tidak valid: ${error.message}`
        : "Durasi paket tidak valid.",
      400
    );
  }

  const transportFee = calculateTransportFee(
    distanceKm,
    freeDistanceKm,
    flatTransportFee
  );
  const totals = calculateBookingTotals({
    packagePrice,
    transportFee,
  });

  return {
    photographerUserId: row.photographer_user_id,
    brandName: row.brand_name,
    photographerAddress: row.photographer_address,
    eventAddress,
    eventLatitude: input.eventLatitude,
    eventLongitude: input.eventLongitude,
    categoryId: row.category_id === null ? null : Number(row.category_id),
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    packageId: row.package_id,
    packageName: row.package_name,
    packageDuration,
    packageDurationMinutes,
    packagePrice,
    distanceKm,
    freeDistanceKm,
    flatTransportFee,
    transportFee: totals.transportFee,
    serviceFeeRate: totals.serviceFeeRate,
    serviceFee: totals.serviceFee,
    photographerPayoutAmount: totals.photographerPayoutAmount,
    totalPrice: totals.totalPrice,
    amount: totals.totalPrice,
  } satisfies BookingQuote;
}
