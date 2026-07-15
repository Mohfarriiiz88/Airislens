function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getDatabaseConfig() {
  return {
    host: getRequiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? "3306"),
    user: getRequiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: getRequiredEnv("DB_NAME"),
  };
}

export function getJwtSecret() {
  return getRequiredEnv("JWT_SECRET");
}

/**
 * Fallback pembacaan konfigurasi Midtrans dari env var.
 * Sumber utama adalah tabel `midtrans_config` di DB (lihat lib/midtrans-config.ts);
 * fungsi ini hanya dipakai saat DB belum diisi.
 */
export function getMidtransEnvFallback() {
  return {
    serverKey: process.env.MIDTRANS_SERVER_KEY?.trim() || null,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() || null,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION?.trim() === "true",
  };
}

export function getSettingsEncryptionKey() {
  return getRequiredEnv("SETTINGS_ENCRYPTION_KEY").trim();
}

export function getFonnteConfig() {
  return {
    token: getRequiredEnv("FONNTE_TOKEN").trim(),
    adminPhone: getRequiredEnv("ADMIN_WA").trim(),
  };
}

export function getOptionalSuperadminEmail() {
  return process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() || null;
}

function getOptionalEnv(name: string) {
  return process.env[name]?.trim() || null;
}

export function getFirebaseAdminConfig() {
  const projectId = getOptionalEnv("FIREBASE_PROJECT_ID");
  const clientEmail = getOptionalEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") || null;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}
