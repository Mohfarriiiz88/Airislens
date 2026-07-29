export const UPLOAD_ROUTE_PREFIX = "/uploads";

export function isUploadedAssetUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(`${UPLOAD_ROUTE_PREFIX}/`)
  );
}

export function getUploadPathSegmentsFromUrl(uploadUrl: string) {
  if (!isUploadedAssetUrl(uploadUrl)) {
    return null;
  }

  const pathname = uploadUrl.split(/[?#]/, 1)[0];
  const relativePath = pathname.slice(UPLOAD_ROUTE_PREFIX.length + 1);

  if (!relativePath) {
    return null;
  }

  try {
    const segments = relativePath
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));

    return segments.length > 0 ? segments : null;
  } catch {
    return null;
  }
}

export function shouldBypassImageOptimization(value: unknown) {
  return (
    typeof value === "string" &&
    (value.startsWith("blob:") ||
      value.startsWith("data:") ||
      isUploadedAssetUrl(value))
  );
}
