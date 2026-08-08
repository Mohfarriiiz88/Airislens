import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, ".next");
const standaloneDir = path.join(nextDir, "standalone");
const staticDir = path.join(nextDir, "static");
const standaloneStaticDir = path.join(standaloneDir, ".next", "static");
const publicDir = path.join(projectRoot, "public");
const standalonePublicDir = path.join(standaloneDir, "public");

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function replaceDirectory(sourcePath, destinationPath, label) {
  if (!(await pathExists(sourcePath))) {
    console.warn(
      `[prepare-standalone] Lewati ${label}: sumber tidak ditemukan (${path.relative(
        projectRoot,
        sourcePath
      )}).`
    );
    return;
  }

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await rm(destinationPath, { recursive: true, force: true });
  await cp(sourcePath, destinationPath, { recursive: true, force: true });

  console.log(
    `[prepare-standalone] Salin ${label} -> ${path.relative(
      projectRoot,
      destinationPath
    )}`
  );
}

if (!(await pathExists(standaloneDir))) {
  throw new Error(
    "Folder .next/standalone belum ada. Jalankan `next build` sebelum menyiapkan standalone output."
  );
}

await replaceDirectory(publicDir, standalonePublicDir, "public");
await replaceDirectory(staticDir, standaloneStaticDir, ".next/static");
