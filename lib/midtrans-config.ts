import "server-only";

import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getDbPool } from "@/lib/db";
import { getMidtransEnvFallback } from "@/lib/env";

type MidtransConfigRow = RowDataPacket & {
  id: number;
  server_key_ciphertext: string | null;
  server_key_iv: string | null;
  server_key_tag: string | null;
  client_key: string | null;
  is_production: number;
  updated_at: Date | null;
  updated_by_user_id: number | null;
};

export type MidtransRuntimeConfig = {
  serverKey: string;
  clientKey: string | null;
  isProduction: boolean;
  source: "db" | "env";
};

export type MidtransConfigSummary = {
  hasServerKey: boolean;
  serverKeyPreview: string | null;
  clientKey: string | null;
  isProduction: boolean;
  updatedAt: string | null;
  usingEnvFallback: {
    serverKey: boolean;
    clientKey: boolean;
  };
};

export type WriteMidtransConfigInput = {
  serverKey?: string | null;
  clientKey?: string | null;
  isProduction: boolean;
};

const CACHE_TTL_MS = 60 * 1000;

type CachedConfig = {
  config: MidtransRuntimeConfig;
  expiresAt: number;
};

let configCache: CachedConfig | null = null;

let schemaReady = false;

async function ensureMidtransConfigSchema() {
  if (schemaReady) {
    return;
  }

  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS midtrans_config (
      id TINYINT UNSIGNED NOT NULL DEFAULT 1,
      server_key_ciphertext TEXT NULL,
      server_key_iv VARCHAR(32) NULL,
      server_key_tag VARCHAR(32) NULL,
      client_key VARCHAR(255) NULL,
      is_production TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id BIGINT UNSIGNED NULL,
      PRIMARY KEY (id)
    )
  `);

  schemaReady = true;
}

export async function readMidtransConfigRow(): Promise<MidtransConfigRow | null> {
  await ensureMidtransConfigSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<MidtransConfigRow[]>(
    `
      SELECT
        id,
        server_key_ciphertext,
        server_key_iv,
        server_key_tag,
        client_key,
        is_production,
        updated_at,
        updated_by_user_id
      FROM midtrans_config
      WHERE id = 1
      LIMIT 1
    `
  );

  return rows[0] ?? null;
}

function decryptServerKeyFromRow(row: MidtransConfigRow | null): string | null {
  if (
    !row ||
    !row.server_key_ciphertext ||
    !row.server_key_iv ||
    !row.server_key_tag
  ) {
    return null;
  }

  return decryptSecret({
    ciphertext: row.server_key_ciphertext,
    iv: row.server_key_iv,
    tag: row.server_key_tag,
  });
}

export function invalidateMidtransConfigCache() {
  configCache = null;
}

async function resolveRuntimeConfig(): Promise<MidtransRuntimeConfig> {
  const row = await readMidtransConfigRow();
  const fallback = getMidtransEnvFallback();

  const dbServerKey = decryptServerKeyFromRow(row);
  const dbClientKey = row?.client_key?.trim() || null;
  const hasDbConfig = Boolean(row && (dbServerKey || dbClientKey));

  const serverKey = dbServerKey ?? fallback.serverKey;
  const clientKey = dbClientKey ?? fallback.clientKey;

  if (!serverKey) {
    throw new Error(
      "Midtrans server key belum dikonfigurasi. Isi lewat halaman Superadmin > Settings atau set MIDTRANS_SERVER_KEY."
    );
  }

  const isProduction = row
    ? row.is_production === 1
    : fallback.isProduction;

  return {
    serverKey,
    clientKey,
    isProduction,
    source: hasDbConfig ? "db" : "env",
  };
}

export async function getMidtransRuntimeConfig(): Promise<MidtransRuntimeConfig> {
  const now = Date.now();

  if (configCache && configCache.expiresAt > now) {
    return configCache.config;
  }

  const config = await resolveRuntimeConfig();
  configCache = { config, expiresAt: now + CACHE_TTL_MS };

  return config;
}

export async function getMidtransPublicConfig(): Promise<{
  clientKey: string | null;
  isProduction: boolean;
}> {
  const fallback = getMidtransEnvFallback();

  try {
    const row = await readMidtransConfigRow();
    const clientKey = row?.client_key?.trim() || fallback.clientKey;
    const isProduction = row ? row.is_production === 1 : fallback.isProduction;

    return { clientKey, isProduction };
  } catch {
    // Keep public pages buildable even before the database is reachable.
    return {
      clientKey: fallback.clientKey,
      isProduction: fallback.isProduction,
    };
  }
}

export async function getMidtransConfigSummary(): Promise<MidtransConfigSummary> {
  const row = await readMidtransConfigRow();
  const fallback = getMidtransEnvFallback();

  const dbServerKey = decryptServerKeyFromRow(row);
  const dbClientKey = row?.client_key?.trim() || null;

  const effectiveServerKey = dbServerKey ?? fallback.serverKey;
  const effectiveClientKey = dbClientKey ?? fallback.clientKey;

  return {
    hasServerKey: Boolean(effectiveServerKey),
    serverKeyPreview: effectiveServerKey
      ? `•••• ${effectiveServerKey.slice(-4)}`
      : null,
    clientKey: effectiveClientKey,
    isProduction: row ? row.is_production === 1 : fallback.isProduction,
    updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
    usingEnvFallback: {
      serverKey: !dbServerKey && Boolean(fallback.serverKey),
      clientKey: !dbClientKey && Boolean(fallback.clientKey),
    },
  };
}

export async function writeMidtransConfig(
  input: WriteMidtransConfigInput,
  updatedByUserId: number | null
) {
  await ensureMidtransConfigSchema();

  const pool = getDbPool();
  const existing = await readMidtransConfigRow();

  // Server key: hanya diperbarui bila nilai baru dikirim (non-kosong).
  let serverKeyCiphertext = existing?.server_key_ciphertext ?? null;
  let serverKeyIv = existing?.server_key_iv ?? null;
  let serverKeyTag = existing?.server_key_tag ?? null;

  const trimmedServerKey = input.serverKey?.trim();
  if (trimmedServerKey) {
    const encrypted = encryptSecret(trimmedServerKey);
    serverKeyCiphertext = encrypted.ciphertext;
    serverKeyIv = encrypted.iv;
    serverKeyTag = encrypted.tag;
  }

  // Client key: bila field dikosongkan, pertahankan nilai lama.
  const trimmedClientKey = input.clientKey?.trim();
  const clientKey = trimmedClientKey || existing?.client_key || null;

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO midtrans_config (
        id,
        server_key_ciphertext,
        server_key_iv,
        server_key_tag,
        client_key,
        is_production,
        updated_by_user_id
      ) VALUES (1, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        server_key_ciphertext = VALUES(server_key_ciphertext),
        server_key_iv = VALUES(server_key_iv),
        server_key_tag = VALUES(server_key_tag),
        client_key = VALUES(client_key),
        is_production = VALUES(is_production),
        updated_by_user_id = VALUES(updated_by_user_id)
    `,
    [
      serverKeyCiphertext,
      serverKeyIv,
      serverKeyTag,
      clientKey,
      input.isProduction ? 1 : 0,
      updatedByUserId,
    ]
  );

  invalidateMidtransConfigCache();
}
