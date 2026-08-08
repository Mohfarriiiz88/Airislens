import "server-only";

type NominatimSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type NominatimReverseResult = {
  display_name?: string;
};

type CachedLocationValue<T> = {
  expiresAt: number;
  value: T;
};

type UpstreamRequestOptions = {
  endpoint: "search" | "reverse";
  params: URLSearchParams;
};

type UpstreamJsonResponse<T> = {
  json: T;
  status: number;
};

export type LocationSearchResult = {
  placeId: string;
  displayName: string;
  primaryText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
};

export type ReverseGeocodedLocation = {
  displayName: string;
  primaryText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
};

export class LocationSearchError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "LocationSearchError";
    this.status = status;
  }
}

declare global {
  var __airislensLocationSearchCache:
    | Map<string, CachedLocationValue<LocationSearchResult[]>>
    | undefined;
  var __airislensLocationReverseCache:
    | Map<string, CachedLocationValue<ReverseGeocodedLocation>>
    | undefined;
  var __airislensLocationUpstreamLastRequestAt: number | undefined;
  var __airislensLocationUpstreamQueue: Promise<void> | undefined;
}

const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://nominatim.openstreetmap.org";
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
  "https://airislens.local";
const APP_IDENTIFIER = `AirisLens/1.0 (${APP_BASE_URL}; booking-location-service)`;
const UPSTREAM_TIMEOUT_MS = 8000;
const UPSTREAM_MIN_INTERVAL_MS = 1000;
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000;
const REVERSE_CACHE_TTL_MS = 60 * 60 * 1000;
const LOCATION_NOT_FOUND_MESSAGE =
  "Lokasi belum ditemukan. Coba gunakan nama jalan, kelurahan, kecamatan, atau pilih titik langsung pada peta.";
const LOCATION_SERVICE_ERROR_MESSAGE =
  "Tidak dapat mencari lokasi saat ini. Silakan coba kembali atau tentukan titik melalui peta.";
const REVERSE_GEOCODE_SERVICE_ERROR_MESSAGE =
  "Titik lokasi sudah dipilih, tetapi nama lokasinya belum dapat dimuat saat ini.";
const LOCATION_FALLBACK_AREA = "Tegal, Jawa Tengah, Indonesia";
const LOCATION_FALLBACK_TERMS =
  /tegal|slawi|kabupaten tegal|kota tegal|jawa tengah|indonesia/i;
const TEGAL_VIEWBOX = {
  west: "108.9800",
  north: "-6.7600",
  east: "109.2600",
  south: "-7.1400",
};

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildLocationParts(displayName: string) {
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    primaryText: parts[0] || displayName,
    secondaryText: parts.slice(1).join(", "),
  };
}

function buildSearchQueries(rawQuery: string) {
  const query = normalizeQuery(rawQuery);

  if (!query) {
    return [];
  }

  if (LOCATION_FALLBACK_TERMS.test(query)) {
    return [query];
  }

  return [query, `${query}, ${LOCATION_FALLBACK_AREA}`];
}

function getSearchCache() {
  if (!global.__airislensLocationSearchCache) {
    global.__airislensLocationSearchCache = new Map();
  }

  return global.__airislensLocationSearchCache;
}

function getReverseCache() {
  if (!global.__airislensLocationReverseCache) {
    global.__airislensLocationReverseCache = new Map();
  }

  return global.__airislensLocationReverseCache;
}

function getCachedValue<T>(
  store: Map<string, CachedLocationValue<T>>,
  key: string
) {
  const cached = store.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  return cached.value;
}

function setCachedValue<T>(
  store: Map<string, CachedLocationValue<T>>,
  key: string,
  value: T,
  ttlMs: number
) {
  store.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

function getNominatimHeaders() {
  return {
    Accept: "application/json",
    "Accept-Language": "id",
    Referer: APP_BASE_URL,
    "User-Agent": APP_IDENTIFIER,
  };
}

function ensureCoordinate(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new LocationSearchError(`${label} tidak valid.`, 400);
  }
}

function mapSearchResult(item: NominatimSearchResult): LocationSearchResult | null {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const displayName = item.display_name?.trim() || "";

  if (!displayName) {
    return null;
  }

  const { primaryText, secondaryText } = buildLocationParts(displayName);

  return {
    placeId: String(item.place_id),
    displayName,
    primaryText,
    secondaryText,
    latitude,
    longitude,
  };
}

function scoreLocationResult(result: LocationSearchResult, rawQuery: string) {
  const haystack =
    `${result.primaryText} ${result.secondaryText} ${result.displayName}`.toLowerCase();
  const query = normalizeQuery(rawQuery).toLowerCase();
  let score = 0;

  if (haystack.includes(query)) {
    score += 60;
  }

  if (result.primaryText.toLowerCase().includes(query)) {
    score += 12;
  }

  if (
    /tegal|slawi|kabupaten tegal|kota tegal/.test(haystack)
  ) {
    score += 18;
  }

  if (/jawa tengah/.test(haystack)) {
    score += 6;
  }

  return score;
}

function buildUpstreamUrl(endpoint: "search" | "reverse", params: URLSearchParams) {
  return `${NOMINATIM_BASE_URL}/${endpoint}?${params.toString()}`;
}

function readResponseSnippet(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function logUpstreamFailure(input: {
  endpoint: "search" | "reverse";
  status: number | null;
  durationMs: number;
  errorName?: string;
  errorMessage?: string;
  responseSnippet?: string;
}) {
  console.error("LOCATION PROVIDER ERROR:", {
    provider: "nominatim",
    endpoint: input.endpoint,
    upstreamStatus: input.status,
    durationMs: input.durationMs,
    errorName: input.errorName || null,
    errorMessage: input.errorMessage || null,
    responseSnippet: input.responseSnippet || null,
  });
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function scheduleUpstreamRequest<T>(task: () => Promise<T>) {
  const previousQueue = global.__airislensLocationUpstreamQueue ?? Promise.resolve();
  let releaseQueue!: () => void;

  global.__airislensLocationUpstreamQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  await previousQueue.catch(() => undefined);

  const now = Date.now();
  const lastRequestAt = global.__airislensLocationUpstreamLastRequestAt ?? 0;
  const waitMs = Math.max(0, lastRequestAt + UPSTREAM_MIN_INTERVAL_MS - now);

  if (waitMs > 0) {
    await wait(waitMs);
  }

  global.__airislensLocationUpstreamLastRequestAt = Date.now();

  try {
    return await task();
  } finally {
    releaseQueue();
  }
}

async function fetchUpstreamJson<T>({
  endpoint,
  params,
}: UpstreamRequestOptions): Promise<UpstreamJsonResponse<T>> {
  return scheduleUpstreamRequest(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const startedAt = Date.now();

    try {
      const response = await fetch(buildUpstreamUrl(endpoint, params), {
        method: "GET",
        headers: getNominatimHeaders(),
        cache: "no-store",
        signal: controller.signal,
      });
      const durationMs = Date.now() - startedAt;
      const bodyText = await response.text();

      if (!response.ok) {
        logUpstreamFailure({
          endpoint,
          status: response.status,
          durationMs,
          responseSnippet: readResponseSnippet(bodyText),
        });
        throw new LocationSearchError(
          endpoint === "search"
            ? LOCATION_SERVICE_ERROR_MESSAGE
            : REVERSE_GEOCODE_SERVICE_ERROR_MESSAGE,
          503
        );
      }

      try {
        return {
          json: JSON.parse(bodyText) as T,
          status: response.status,
        };
      } catch (error) {
        logUpstreamFailure({
          endpoint,
          status: response.status,
          durationMs,
          errorName: error instanceof Error ? error.name : "ParseError",
          errorMessage:
            error instanceof Error ? error.message : "Invalid upstream JSON",
          responseSnippet: readResponseSnippet(bodyText),
        });
        throw new LocationSearchError(
          endpoint === "search"
            ? LOCATION_SERVICE_ERROR_MESSAGE
            : REVERSE_GEOCODE_SERVICE_ERROR_MESSAGE,
          503
        );
      }
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      if (error instanceof LocationSearchError) {
        throw error;
      }

      logUpstreamFailure({
        endpoint,
        status: null,
        durationMs,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage:
          error instanceof Error ? error.message : "Unknown upstream error",
      });
      throw new LocationSearchError(
        endpoint === "search"
          ? LOCATION_SERVICE_ERROR_MESSAGE
          : REVERSE_GEOCODE_SERVICE_ERROR_MESSAGE,
        503
      );
    } finally {
      clearTimeout(timeoutId);
    }
  });
}

async function fetchSearchResults(query: string) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "6",
    addressdetails: "1",
    dedupe: "1",
    countrycodes: "id",
    layer: "address,poi",
    viewbox: `${TEGAL_VIEWBOX.west},${TEGAL_VIEWBOX.north},${TEGAL_VIEWBOX.east},${TEGAL_VIEWBOX.south}`,
    "accept-language": "id",
  });
  const response = await fetchUpstreamJson<NominatimSearchResult[]>({
    endpoint: "search",
    params,
  });

  return response.json;
}

export async function searchLocations(rawQuery: string, limit = 6) {
  const query = normalizeQuery(rawQuery);

  if (query.length < 3) {
    throw new LocationSearchError(
      "Masukkan minimal 3 karakter untuk mencari lokasi.",
      400
    );
  }

  const cacheKey = query.toLowerCase();
  const cached = getCachedValue(getSearchCache(), cacheKey);

  if (cached) {
    return cached.slice(0, Math.max(1, limit));
  }

  const results = new Map<string, LocationSearchResult>();

  for (const searchQuery of buildSearchQueries(query)) {
    const matches = await fetchSearchResults(searchQuery);

    for (const item of matches) {
      const mapped = mapSearchResult(item);

      if (mapped && !results.has(mapped.placeId)) {
        results.set(mapped.placeId, mapped);
      }
    }

    if (results.size > 0) {
      break;
    }
  }

  const rankedResults = Array.from(results.values())
    .sort((left, right) => {
      const scoreDelta =
        scoreLocationResult(right, query) - scoreLocationResult(left, query);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.displayName.localeCompare(right.displayName, "id");
    })
    .slice(0, Math.max(1, limit));

  if (rankedResults.length === 0) {
    throw new LocationSearchError(LOCATION_NOT_FOUND_MESSAGE, 404);
  }

  setCachedValue(getSearchCache(), cacheKey, rankedResults, SEARCH_CACHE_TTL_MS);
  return rankedResults;
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
) {
  ensureCoordinate(latitude, -90, 90, "Latitude");
  ensureCoordinate(longitude, -180, 180, "Longitude");

  const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = getCachedValue(getReverseCache(), cacheKey);

  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    lat: latitude.toFixed(8),
    lon: longitude.toFixed(8),
    format: "jsonv2",
    zoom: "18",
    addressdetails: "1",
    "accept-language": "id",
  });
  const response = await fetchUpstreamJson<NominatimReverseResult>({
    endpoint: "reverse",
    params,
  });
  const displayName = response.json.display_name?.trim() || "";

  if (!displayName) {
    throw new LocationSearchError(REVERSE_GEOCODE_SERVICE_ERROR_MESSAGE, 404);
  }

  const { primaryText, secondaryText } = buildLocationParts(displayName);
  const location = {
    displayName,
    primaryText,
    secondaryText,
    latitude,
    longitude,
  } satisfies ReverseGeocodedLocation;

  setCachedValue(getReverseCache(), cacheKey, location, REVERSE_CACHE_TTL_MS);
  return location;
}

export function getLocationNotFoundMessage() {
  return LOCATION_NOT_FOUND_MESSAGE;
}

export function getLocationServiceErrorMessage() {
  return LOCATION_SERVICE_ERROR_MESSAGE;
}

export function getReverseLocationServiceErrorMessage() {
  return REVERSE_GEOCODE_SERVICE_ERROR_MESSAGE;
}
