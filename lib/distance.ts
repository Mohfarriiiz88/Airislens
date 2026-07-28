const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const sourceLat = toRadians(lat1);
  const destinationLat = toRadians(lat2);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(sourceLat) * Math.cos(destinationLat) * Math.sin(dLon / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return roundToTwoDecimals(EARTH_RADIUS_KM * arc);
}

export function calculateTransportFee(
  distanceKm: number,
  freeDistanceKm: number,
  flatTransportFee: number
) {
  if (distanceKm <= freeDistanceKm) {
    return 0;
  }

  return Math.max(0, Math.round(flatTransportFee));
}
