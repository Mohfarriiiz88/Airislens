import "server-only";

import { getOptionalServiceFeeRate } from "@/lib/env";

const DEFAULT_SERVICE_FEE_RATE_DECIMAL = 0.03;

function normalizeServiceFeeRateDecimal(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_SERVICE_FEE_RATE_DECIMAL;
  }

  if (value >= 1) {
    return value / 100;
  }

  return value;
}

function roundPercentage(value: number) {
  return Math.round(value * 100) / 100;
}

function roundRupiah(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

export function getServiceFeeRateDecimal() {
  return normalizeServiceFeeRateDecimal(getOptionalServiceFeeRate());
}

export function getServiceFeeRatePercent() {
  return roundPercentage(getServiceFeeRateDecimal() * 100);
}

export function calculateServiceFee(
  packagePrice: number,
  serviceFeeRateDecimal = getServiceFeeRateDecimal()
) {
  return roundRupiah(packagePrice * serviceFeeRateDecimal);
}

export function calculatePhotographerBookingAmount(
  packagePrice: number,
  transportFee: number
) {
  return roundRupiah(packagePrice + transportFee);
}

export function calculateBookingTotals(input: {
  packagePrice: number;
  transportFee: number;
  serviceFeeRateDecimal?: number;
}) {
  const packagePrice = roundRupiah(input.packagePrice);
  const transportFee = roundRupiah(input.transportFee);
  const serviceFeeRateDecimal = normalizeServiceFeeRateDecimal(
    input.serviceFeeRateDecimal ?? getOptionalServiceFeeRate()
  );
  const serviceFeeRate = roundPercentage(serviceFeeRateDecimal * 100);
  const serviceFee = calculateServiceFee(packagePrice, serviceFeeRateDecimal);
  const photographerPayoutAmount = calculatePhotographerBookingAmount(
    packagePrice,
    transportFee
  );
  const totalPrice = roundRupiah(photographerPayoutAmount + serviceFee);

  return {
    packagePrice,
    transportFee,
    serviceFeeRateDecimal,
    serviceFeeRate,
    serviceFee,
    photographerPayoutAmount,
    totalPrice,
  };
}
