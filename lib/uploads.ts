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

const ALLOWED_UPLOAD_KINDS = ["profile", "gallery", "partner-cv"] as const;
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
const MAX_DOCUMENT_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2400;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const WEBP_DIMENSION_STEPS = [MAX_IMAGE_DIMENSION, 2000, 1600, 1280];
const WEBP_QUALITY_STEPS = [82, 76, 70, 64, 58, 52];
const WEBP_EFFORT = 4;

const ALLOWED_SOURCE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_SOURCE_FORMATS = new Set(["jpeg", "png", "webp"]);
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);
const DOCUMENT_EXTENSION_BY_MIME = new Map<string, string>([
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docx",
  ],
]);

const CONTENT_TYPE_BY_EXTENSION = new Map<string, string>([
  [".avif", "image/avif"],
  [".bmp", "image/bmp"],
  [".doc", "application/msword"],
  [
    ".docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  [".gif", "image/gif"],
  [".jfif", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".pdf", "application/pdf"],
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
    let transformedBuffer: Buffer | null = null;

    for (const maxDimension of WEBP_DIMENSION_STEPS) {
      const pipeline = sharp(sourceBuffer, { failOn: "error" })
        .autoOrient()
        .resize({
          width: maxDimension,
          height: maxDimension,
          fit: "inside",
          withoutEnlargement: true,
        });

      for (const quality of WEBP_QUALITY_STEPS) {
        transformedBuffer = await pipeline
          .clone()
          .webp({
            quality,
            effort: WEBP_EFFORT,
            smartSubsample: true,
          })
          .toBuffer();

        if (transformedBuffer.length <= MAX_OUTPUT_BYTES) {
          return transformedBuffer;
        }
      }
    }

    if (transformedBuffer) {
      return transformedBuffer;
    }
  } catch {
    throw new UploadError("Gambar tidak dapat diproses.", 400);
  }

  throw new UploadError("Gambar tidak dapat diproses.", 400);
}

async function prepareUploadedDocument(file: File) {
  if (file.size <= 0) {
    throw new UploadError("File upload wajib diisi.", 400);
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    throw new UploadError("Ukuran file CV maksimal 5 MB.", 400);
  }

  const mimeType = file.type.trim().toLowerCase();
  const extensionFromMime = DOCUMENT_EXTENSION_BY_MIME.get(mimeType) ?? null;
  const originalExtension = path.extname(file.name ?? "").toLowerCase();
  const resolvedExtension =
    extensionFromMime ||
    (ALLOWED_DOCUMENT_EXTENSIONS.has(originalExtension)
      ? originalExtension
      : null);

  if (!resolvedExtension) {
    throw new UploadError(
      "Format CV tidak didukung. Gunakan PDF, DOC, atau DOCX.",
      400
    );
  }

  if (
    extensionFromMime &&
    originalExtension &&
    originalExtension !== extensionFromMime
  ) {
    throw new UploadError(
      "Format CV tidak didukung. Gunakan PDF, DOC, atau DOCX.",
      400
    );
  }

  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    extension: resolvedExtension,
  };
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

  const isOwnedFileName =
    fileName.startsWith(`${input.userId}-`) &&
    (input.kind === "partner-cv"
      ? /\.(pdf|doc|docx)$/i.test(fileName)
      : fileName.toLowerCase().endsWith(".webp"));

  if (!isOwnedFileName) {
    throw new UploadError("Anda tidak memiliki akses ke file upload ini.", 403);
  }

  const existingFilePath = await resolveExistingUploadFilePath(pathSegments);

  if (!existingFilePath) {
    throw new UploadError("File upload tidak ditemukan.", 400);
  }
}

export async function saveUploadedFile(input: {
  file: File;
  kind: UploadKind;
  userId: number;
}) {
  const uploadRoot = getUploadRootDirectory();
  const absoluteDirectory = path.join(uploadRoot, "partners", input.kind);

  let fileName: string;
  let fileBuffer: Buffer;

  if (input.kind === "partner-cv") {
    const preparedDocument = await prepareUploadedDocument(input.file);

    fileName = `${input.userId}-${randomUUID()}${preparedDocument.extension}`;
    fileBuffer = preparedDocument.buffer;
  } else {
    fileName = `${input.userId}-${randomUUID()}.webp`;
    fileBuffer = await transformUploadedFile(input.file);
  }

  const relativePath = buildRelativeUploadPath(input.kind, fileName);

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(path.join(absoluteDirectory, fileName), fileBuffer);

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
