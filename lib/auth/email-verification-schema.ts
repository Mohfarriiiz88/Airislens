import "server-only";

import { type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";

declare global {
  var __airislensEmailVerificationSchemaReady: boolean | undefined;
  var __airislensEmailVerificationSchemaPromise: Promise<void> | undefined;
}

type ColumnRow = RowDataPacket & {
  COLUMN_NAME: string;
};

type IndexRow = RowDataPacket & {
  INDEX_NAME: string;
};

async function applyEmailVerificationSchema() {
  const pool = getDbPool();
  const [columnRows, indexRows] = await Promise.all([
    pool.execute<ColumnRow[]>(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME IN (
            'email_verified_at',
            'verification_token',
            'verification_expires_at'
          )
      `
    ),
    pool.execute<IndexRow[]>(
      `
        SELECT INDEX_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND INDEX_NAME = 'users_verification_token_unique'
        LIMIT 1
      `
    ),
  ]);

  const existingColumns = new Set(columnRows[0].map((row) => row.COLUMN_NAME));
  const hasVerificationIndex = indexRows[0].length > 0;
  const addedEmailVerifiedAt = !existingColumns.has("email_verified_at");

  if (!existingColumns.has("email_verified_at")) {
    await pool.execute(`
      ALTER TABLE users
      ADD COLUMN email_verified_at DATETIME NULL DEFAULT NULL AFTER role
    `);
  }

  if (!existingColumns.has("verification_token")) {
    await pool.execute(`
      ALTER TABLE users
      ADD COLUMN verification_token VARCHAR(255) DEFAULT NULL AFTER email_verified_at
    `);
  }

  if (!existingColumns.has("verification_expires_at")) {
    await pool.execute(`
      ALTER TABLE users
      ADD COLUMN verification_expires_at DATETIME DEFAULT NULL AFTER verification_token
    `);
  }

  if (!hasVerificationIndex) {
    await pool.execute(`
      ALTER TABLE users
      ADD UNIQUE KEY users_verification_token_unique (verification_token)
    `);
  }

  if (addedEmailVerifiedAt) {
    await pool.execute(`
      UPDATE users
      SET
        email_verified_at = COALESCE(email_verified_at, NOW()),
        verification_token = NULL,
        verification_expires_at = NULL
      WHERE email_verified_at IS NULL
    `);
  }
}

export async function ensureEmailVerificationSchema() {
  if (global.__airislensEmailVerificationSchemaReady) {
    return;
  }

  if (!global.__airislensEmailVerificationSchemaPromise) {
    global.__airislensEmailVerificationSchemaPromise = applyEmailVerificationSchema()
      .then(() => {
        global.__airislensEmailVerificationSchemaReady = true;
      })
      .catch((error) => {
        global.__airislensEmailVerificationSchemaPromise = undefined;
        throw error;
      });
  }

  return global.__airislensEmailVerificationSchemaPromise;
}
