function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getRequiredTrimmedEnv(name: string) {
  return getRequiredEnv(name).trim();
}

const EMAIL_VERIFICATION_ENV_NAMES = [
  "NEXT_PUBLIC_APP_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
] as const;

export function getDatabaseConfig() {
  return {
    host: getRequiredTrimmedEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? "3306"),
    user: getRequiredTrimmedEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: getRequiredTrimmedEnv("DB_NAME"),
  };
}

export function getJwtSecret() {
  return getRequiredTrimmedEnv("JWT_SECRET");
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
  return getRequiredTrimmedEnv("SETTINGS_ENCRYPTION_KEY");
}

export function getFonnteConfig() {
  return {
    token: getRequiredTrimmedEnv("FONNTE_TOKEN"),
    adminPhone: getRequiredTrimmedEnv("ADMIN_WA"),
  };
}

export function getOptionalSuperadminEmail() {
  return process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() || null;
}

export function getAppBaseUrl() {
  const value = getRequiredTrimmedEnv("NEXT_PUBLIC_APP_URL");

  return value.replace(/\/+$/, "");
}

export function getSmtpConfig() {
  return {
    host: getRequiredTrimmedEnv("SMTP_HOST"),
    port: Number(getRequiredTrimmedEnv("SMTP_PORT")),
    user: getRequiredTrimmedEnv("SMTP_USER"),
    pass: getRequiredTrimmedEnv("SMTP_PASS"),
    from: getRequiredTrimmedEnv("SMTP_FROM"),
  };
}

export function getMissingEmailVerificationEnvVars() {
  return EMAIL_VERIFICATION_ENV_NAMES.filter(
    (name) => !process.env[name]?.trim()
  );
}

export function getOptionalServiceFeeRate() {
  const value = process.env.SERVICE_FEE_RATE?.trim();

  if (!value) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : null;
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
