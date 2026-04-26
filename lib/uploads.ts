import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_UPLOAD_KINDS = ["profile", "gallery"] as const;

export type UploadKind = (typeof ALLOWED_UPLOAD_KINDS)[number];

function sanitizeBaseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getSafeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
  ]);

  return allowedExtensions.has(extension) ? extension : ".jpg";
}

export function isUploadKind(value: string): value is UploadKind {
  return ALLOWED_UPLOAD_KINDS.includes(value as UploadKind);
}

export async function saveUploadedFile(input: {
  file: File;
  kind: UploadKind;
  userId: number;
}) {
  const extension = getSafeExtension(input.file.name);
  const safeBaseName =
    sanitizeBaseName(input.file.name.replace(path.extname(input.file.name), "")) ||
    input.kind;
  const fileName = `${input.userId}-${Date.now()}-${safeBaseName}${extension}`;
  const relativeDirectory = path.join("uploads", "partners", input.kind);
  const absoluteDirectory = path.join(process.cwd(), "public", relativeDirectory);

  await mkdir(absoluteDirectory, { recursive: true });

  const arrayBuffer = await input.file.arrayBuffer();
  const absoluteFilePath = path.join(absoluteDirectory, fileName);

  await writeFile(absoluteFilePath, Buffer.from(arrayBuffer));

  return `/${path.posix.join("uploads", "partners", input.kind, fileName)}`;
}
