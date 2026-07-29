import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  getUploadPathSegmentsFromUrl,
  isUploadedAssetUrl,
  UPLOAD_ROUTE_PREFIX,
} from "@/lib/uploaded-assets";

const ALLOWED_UPLOAD_KINDS = ["profile", "gallery"] as const;
const DEFAULT_UPLOAD_ROOT = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "public",
  "uploads"
);
const LEGACY_PUBLIC_UPLOADS_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "public",
  "uploads"
);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2400;
const WEBP_QUALITY = 82;

const ALLOWED_SOURCE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_SOURCE_FORMATS = new Set(["jpeg", "png", "webp"]);

const CONTENT_TYPE_BY_EXTENSION = new Map<string, string>([
  [".avif", "image/avif"],
  [".bmp", "image/bmp"],
  [".gif", "image/gif"],
  [".jfif", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
  [".webp", "image/webp"],
]);

export type UploadKind = (typeof ALLOWED_UPLOAD_KINDS)[number];

export class UploadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

function getUploadRootDirectory() {
  const configuredDirectory = process.env.UPLOAD_ROOT?.trim();

  if (!configuredDirectory) {
    return path.resolve(DEFAULT_UPLOAD_ROOT);
  }

  return path.isAbsolute(configuredDirectory)
    ? configuredDirectory
    : path.resolve(
        /* turbopackIgnore: true */ process.cwd(),
        configuredDirectory
      );
}

function getLegacyPublicUploadsRootDirectory() {
  return path.resolve(LEGACY_PUBLIC_UPLOADS_DIR);
}

function getUploadRootDirectories() {
  return Array.from(
    new Set([getUploadRootDirectory(), getLegacyPublicUploadsRootDirectory()])
  );
}

function buildRelativeUploadPath(kind: UploadKind, fileName: string) {
  return path.posix.join("partners", kind, fileName);
}

function buildUploadUrl(relativePath: string) {
  return `${UPLOAD_ROUTE_PREFIX}/${relativePath}`;
}

function normalizeUploadPathSegments(pathSegments: string[]) {
  if (pathSegments.length === 0) {
    throw new UploadError("Path upload tidak valid.", 400);
  }

  const normalizedSegments: string[] = [];

  for (const segment of pathSegments) {
    const trimmedSegment = segment.trim();

    if (
      !trimmedSegment ||
      trimmedSegment === "." ||
      trimmedSegment === ".." ||
      trimmedSegment.includes("\\") ||
      trimmedSegment.includes("/") ||
      trimmedSegment.includes(":")
    ) {
      throw new UploadError("Path upload tidak valid.", 400);
    }

    normalizedSegments.push(trimmedSegment);
  }

  return normalizedSegments;
}

function resolvePathWithin(baseDirectory: string, pathSegments: string[]) {
  const resolvedBaseDirectory = path.resolve(baseDirectory);
  const resolvedPath = path.resolve(resolvedBaseDirectory, ...pathSegments);
  const normalizedBaseDirectory = `${resolvedBaseDirectory}${path.sep}`;

  if (
    resolvedPath !== resolvedBaseDirectory &&
    !resolvedPath.startsWith(normalizedBaseDirectory)
  ) {
    return null;
  }

  return resolvedPath;
}

async function fileExists(filePath: string) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

function getContentTypeForFilePath(filePath: string) {
  return (
    CONTENT_TYPE_BY_EXTENSION.get(path.extname(filePath).toLowerCase()) ??
    "application/octet-stream"
  );
}

async function resolveExistingUploadFilePath(pathSegments: string[]) {
  const normalizedPathSegments = normalizeUploadPathSegments(pathSegments);

  for (const uploadRoot of getUploadRootDirectories()) {
    const absoluteFilePath = resolvePathWithin(uploadRoot, normalizedPathSegments);

    if (!absoluteFilePath) {
      continue;
    }

    if (!(await fileExists(absoluteFilePath))) {
      continue;
    }

    return absoluteFilePath;
  }

  return null;
}

async function transformUploadedFile(file: File) {
  if (file.size <= 0) {
    throw new UploadError("File upload wajib diisi.", 400);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("Ukuran file maksimal 10 MB.", 400);
  }

  const mimeType = file.type.trim().toLowerCase();

  if (!ALLOWED_SOURCE_MIME_TYPES.has(mimeType)) {
    throw new UploadError(
      "Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau WebP.",
      400
    );
  }

  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  let metadata: sharp.Metadata;

  try {
    metadata = await sharp(sourceBuffer, { failOn: "error" }).metadata();
  } catch {
    throw new UploadError("Gambar tidak dapat diproses.", 400);
  }

  if (!metadata.format || !ALLOWED_SOURCE_FORMATS.has(metadata.format)) {
    throw new UploadError(
      "Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau WebP.",
      400
    );
  }

  try {
    return await sharp(sourceBuffer, { failOn: "error" })
      .autoOrient()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
      })
      .toBuffer();
  } catch {
    throw new UploadError("Gambar tidak dapat diproses.", 400);
  }
}

function parseOwnedUploadUrl(uploadUrl: string, kind: UploadKind) {
  const pathSegments = getUploadPathSegmentsFromUrl(uploadUrl);

  if (!pathSegments || pathSegments.length !== 3) {
    throw new UploadError("URL gambar tidak valid.", 400);
  }

  const [scope, uploadKind, fileName] = pathSegments;

  if (scope !== "partners" || !isUploadKind(uploadKind) || uploadKind !== kind) {
    throw new UploadError("URL gambar tidak valid.", 400);
  }

  return {
    fileName,
    pathSegments,
  };
}

export function isUploadKind(value: string): value is UploadKind {
  return ALLOWED_UPLOAD_KINDS.includes(value as UploadKind);
}

export async function assertOwnedUploadUrl(
  uploadUrl: string,
  input: {
    kind: UploadKind;
    userId: number;
  }
) {
  const { fileName, pathSegments } = parseOwnedUploadUrl(uploadUrl, input.kind);

  if (
    !fileName.startsWith(`${input.userId}-`) ||
    !fileName.toLowerCase().endsWith(".webp")
  ) {
    throw new UploadError("Anda tidak memiliki akses ke gambar ini.", 403);
  }

  const existingFilePath = await resolveExistingUploadFilePath(pathSegments);

  if (!existingFilePath) {
    throw new UploadError("Gambar upload tidak ditemukan.", 400);
  }
}

export async function saveUploadedFile(input: {
  file: File;
  kind: UploadKind;
  userId: number;
}) {
  const transformedBuffer = await transformUploadedFile(input.file);
  const uploadRoot = getUploadRootDirectory();
  const fileName = `${input.userId}-${randomUUID()}.webp`;
  const relativePath = buildRelativeUploadPath(input.kind, fileName);
  const absoluteDirectory = path.join(uploadRoot, "partners", input.kind);

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(path.join(absoluteDirectory, fileName), transformedBuffer);

  return buildUploadUrl(relativePath);
}

export async function readUploadedFile(pathSegments: string[]) {
  const absoluteFilePath = await resolveExistingUploadFilePath(pathSegments);

  if (!absoluteFilePath) {
    return null;
  }

  return {
    buffer: await readFile(absoluteFilePath),
    contentType: getContentTypeForFilePath(absoluteFilePath),
  };
}

export async function deleteUploadedFileByUrl(uploadUrl: string) {
  if (!isUploadedAssetUrl(uploadUrl)) {
    return false;
  }

  const pathSegments = getUploadPathSegmentsFromUrl(uploadUrl);

  if (!pathSegments) {
    return false;
  }

  const normalizedPathSegments = normalizeUploadPathSegments(pathSegments);
  let hasDeletedFile = false;

  for (const uploadRoot of getUploadRootDirectories()) {
    const absoluteFilePath = resolvePathWithin(uploadRoot, normalizedPathSegments);

    if (!absoluteFilePath) {
      continue;
    }

    try {
      const fileStat = await stat(absoluteFilePath);

      if (!fileStat.isFile()) {
        continue;
      }

      await unlink(absoluteFilePath);
      hasDeletedFile = true;
    } catch (error) {
      const errorCode =
        error instanceof Error && "code" in error
          ? String(error.code)
          : undefined;

      if (errorCode === "ENOENT") {
        continue;
      }

      throw new UploadError("Gagal menghapus file upload.", 500);
    }
  }

  return hasDeletedFile;
}
