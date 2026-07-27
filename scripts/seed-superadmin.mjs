import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import mysql from "mysql2/promise";

const scrypt = promisify(scryptCallback);

loadEnvFile(".env");
loadEnvFile(".env.local", true);

function loadEnvFile(fileName, override = false) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const source = readFileSync(filePath, "utf8");

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (override || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, 64);

  return `scrypt:${salt}:${derivedKey.toString("base64url")}`;
}

async function ensureSuperadminSchema(connection) {
  const [roleColumnRows] = await connection.execute(
    `
      SELECT COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'role'
      LIMIT 1
    `
  );

  const roleColumn = roleColumnRows[0];

  if (!roleColumn) {
    throw new Error("Table users belum ada. Jalankan database/auth.sql terlebih dahulu.");
  }

  if (!String(roleColumn.COLUMN_TYPE).includes("'superadmin'")) {
    await connection.execute(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('superadmin', 'admin', 'user') NOT NULL DEFAULT 'user'
    `);
  }

  const [superadminSlotRows] = await connection.execute(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'superadmin_slot'
      LIMIT 1
    `
  );

  if (superadminSlotRows.length === 0) {
    await connection.execute(`
      ALTER TABLE users
      ADD COLUMN superadmin_slot TINYINT GENERATED ALWAYS AS (
        CASE WHEN role = 'superadmin' THEN 1 ELSE NULL END
      ) STORED
    `);
  }

  const [singletonIndexRows] = await connection.execute(
    `
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND INDEX_NAME = 'users_superadmin_singleton'
      LIMIT 1
    `
  );

  if (singletonIndexRows.length === 0) {
    await connection.execute(`
      ALTER TABLE users
      ADD UNIQUE KEY users_superadmin_singleton (superadmin_slot)
    `);
  }

  const emailVerificationColumns = [
    {
      name: "email_verified_at",
      ddl: "ADD COLUMN email_verified_at DATETIME NULL DEFAULT NULL AFTER role",
    },
    {
      name: "verification_token",
      ddl:
        "ADD COLUMN verification_token VARCHAR(255) DEFAULT NULL AFTER email_verified_at",
    },
    {
      name: "verification_expires_at",
      ddl:
        "ADD COLUMN verification_expires_at DATETIME DEFAULT NULL AFTER verification_token",
    },
  ];

  for (const column of emailVerificationColumns) {
    const [rows] = await connection.execute(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = ?
        LIMIT 1
      `,
      [column.name]
    );

    if (rows.length === 0) {
      await connection.execute(`
        ALTER TABLE users
        ${column.ddl}
      `);
    }
  }

  const [verificationIndexRows] = await connection.execute(
    `
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND INDEX_NAME = 'users_verification_token_unique'
      LIMIT 1
    `
  );

  if (verificationIndexRows.length === 0) {
    await connection.execute(`
      ALTER TABLE users
      ADD UNIQUE KEY users_verification_token_unique (verification_token)
    `);
  }
}

async function upsertSuperadmin(connection, input) {
  const passwordHash = await hashPassword(input.password);
  const [superadminRows] = await connection.execute(
    `
      SELECT id, email
      FROM users
      WHERE role = 'superadmin'
      LIMIT 1
    `
  );

  const existingSuperadmin = superadminRows[0];

  if (existingSuperadmin && existingSuperadmin.email !== input.email) {
    throw new Error(
      `Superadmin sudah ada dengan email ${existingSuperadmin.email}. Hapus atau ubah akun itu terlebih dahulu.`
    );
  }

  if (existingSuperadmin) {
    await connection.execute(
      `
        UPDATE users
        SET
          name = ?,
          email = ?,
          password_hash = ?,
          email_verified_at = COALESCE(email_verified_at, NOW()),
          verification_token = NULL,
          verification_expires_at = NULL
        WHERE id = ?
      `,
      [input.name, input.email, passwordHash, existingSuperadmin.id]
    );

    console.log(`Superadmin diperbarui: ${input.email}`);
    return;
  }

  const [emailRows] = await connection.execute(
    `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [input.email]
  );

  const existingUserWithEmail = emailRows[0];

  if (existingUserWithEmail) {
    await connection.execute(
      `
        UPDATE users
        SET
          name = ?,
          password_hash = ?,
          role = 'superadmin',
          email_verified_at = COALESCE(email_verified_at, NOW()),
          verification_token = NULL,
          verification_expires_at = NULL
        WHERE id = ?
      `,
      [input.name, passwordHash, existingUserWithEmail.id]
    );

    console.log(`User dengan email ${input.email} dipromosikan menjadi superadmin.`);
    return;
  }

  await connection.execute(
    `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        email_verified_at,
        verification_token,
        verification_expires_at
      )
      VALUES (?, ?, ?, 'superadmin', NOW(), NULL, NULL)
    `,
    [input.name, input.email, passwordHash]
  );

  console.log(`Superadmin dibuat: ${input.email}`);
}

async function main() {
  const config = {
    host: getRequiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? "3306"),
    user: getRequiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: getRequiredEnv("DB_NAME"),
  };

  const superadmin = {
    name: getRequiredEnv("SUPERADMIN_NAME"),
    email: getRequiredEnv("SUPERADMIN_EMAIL").toLowerCase(),
    password: getRequiredEnv("SUPERADMIN_PASSWORD"),
  };

  const passwordErrors = [];

  if (superadmin.password.length < 8) {
    passwordErrors.push("minimal 8 karakter");
  }

  if (!/[a-z]/.test(superadmin.password) || !/[A-Z]/.test(superadmin.password)) {
    passwordErrors.push("huruf besar dan kecil");
  }

  if (!/[0-9]/.test(superadmin.password)) {
    passwordErrors.push("angka");
  }

  if (!/[^a-zA-Z0-9]/.test(superadmin.password)) {
    passwordErrors.push("simbol");
  }

  if (
    superadmin.password.toLowerCase().includes(superadmin.email.toLowerCase())
  ) {
    passwordErrors.push("tidak mengandung email");
  }

  if (passwordErrors.length > 0) {
    throw new Error(
      `SUPERADMIN_PASSWORD tidak valid, wajib mengandung: ${passwordErrors.join(", ")}.`
    );
  }

  const connection = await mysql.createConnection(config);

  try {
    await ensureSuperadminSchema(connection);
    await upsertSuperadmin(connection, superadmin);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
