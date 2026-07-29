import "server-only";

import { readFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ALLOWED_UPLOAD_KINDS = ["profile", "gallery"] as const;
const UPLOAD_ROUTE_PREFIX = "/uploads";
const DEFAULT_UPLOADS_DIR = path.join("storage", "uploads");
const LEGACY_PUBLIC_UPLOADS_DIR = path.join("public", "uploads");
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const CONTENT_TYPE_BY_EXTENSION = new Map<string, string>([
  [".avif", "image/avif"],
  [".bmp", "image/bmp"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
  [".webp", "image/webp"],
]);

const WEBP_SOURCE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

const PASSTHROUGH_EXTENSIONS = new Set([".gif", ".svg"]);

export type UploadKind = (typeof ALLOWED_UPLOAD_KINDS)[number];

export class UploadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

function sanitizeBaseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getSafeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  return CONTENT_TYPE_BY_EXTENSION.has(extension) ? extension : "";
}

function getUploadsRootDirectory() {
  const configuredDirectory = process.env.UPLOADS_DIR?.trim();

  if (!configuredDirectory) {
    return path.resolve(process.cwd(), DEFAULT_UPLOADS_DIR);
  }

  return path.isAbsolute(configuredDirectory)
    ? configuredDirectory
    : path.resolve(process.cwd(), configuredDirectory);
}

function getLegacyPublicUploadsRootDirectory() {
  return path.resolve(process.cwd(), LEGACY_PUBLIC_UPLOADS_DIR);
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
      trimmedSegment.includes("\\")
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

async function transformUploadedFile(file: File) {
  if (file.size <= 0) {
    throw new UploadError("File upload wajib diisi.", 400);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("Ukuran file maksimal 15 MB.", 400);
  }

  const sourceExtension = getSafeExtension(file.name);

  if (!sourceExtension) {
    throw new UploadError(
      "Format file tidak didukung. Gunakan JPG, PNG, WEBP, GIF, atau SVG.",
      400
    );
  }

  const sourceBuffer = Buffer.from(await file.arrayBuffer());

  if (PASSTHROUGH_EXTENSIONS.has(sourceExtension)) {
    return {
      buffer: sourceBuffer,
      extension: sourceExtension,
    };
  }

  if (!WEBP_SOURCE_EXTENSIONS.has(sourceExtension)) {
    throw new UploadError("Format file tidak didukung untuk upload gambar.", 400);
  }

  try {
    const transformedBuffer = await sharp(sourceBuffer, {
      failOn: "none",
    })
      .rotate()
      .webp({
        quality: 86,
        effort: 4,
      })
      .toBuffer();

    return {
      buffer: transformedBuffer,
      extension: ".webp",
    };
  } catch (error) {
    throw new UploadError(
      error instanceof Error
        ? `Gagal memproses gambar upload: ${error.message}`
        : "Gagal memproses gambar upload.",
      400
    );
  }
}

export function isUploadKind(value: string): value is UploadKind {
  return ALLOWED_UPLOAD_KINDS.includes(value as UploadKind);
}

export async function saveUploadedFile(input: {
  file: File;
  kind: UploadKind;
  userId: number;
}) {
  const { buffer, extension } = await transformUploadedFile(input.file);
  const safeBaseName =
    sanitizeBaseName(input.file.name.replace(path.extname(input.file.name), "")) ||
    input.kind;
  const fileName = `${input.userId}-${Date.now()}-${safeBaseName}${extension}`;
  const relativePath = buildRelativeUploadPath(input.kind, fileName);
  const absoluteDirectory = path.join(
    getUploadsRootDirectory(),
    "partners",
    input.kind
  );

  await mkdir(absoluteDirectory, { recursive: true });

  const absoluteFilePath = path.join(getUploadsRootDirectory(), relativePath);

  await writeFile(absoluteFilePath, buffer);

  return buildUploadUrl(relativePath);
}

export async function readUploadedFile(pathSegments: string[]) {
  const normalizedPathSegments = normalizeUploadPathSegments(pathSegments);
  const uploadRoots = [
    getUploadsRootDirectory(),
    getLegacyPublicUploadsRootDirectory(),
  ];

  for (const uploadRoot of uploadRoots) {
    const absoluteFilePath = resolvePathWithin(uploadRoot, normalizedPathSegments);

    if (!absoluteFilePath) {
      continue;
    }

    if (!(await fileExists(absoluteFilePath))) {
      continue;
    }

    return {
      buffer: await readFile(absoluteFilePath),
      contentType: getContentTypeForFilePath(absoluteFilePath),
    };
  }

  return null;
}
