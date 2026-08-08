import {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

import { ensureEmailVerificationSchema } from "@/lib/auth/email-verification-schema";
import { getDbPool } from "@/lib/db";

export type UserRole = "superadmin" | "admin" | "user";

export type UserRecord = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone: string | null;
  email_verified_at: Date | null;
  verification_token: string | null;
  verification_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type UserQueryExecutor = Pool | PoolConnection;

export type SafeUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type SuperadminUserRecord = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: Date;
};

export type SuperadminUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export function toSafeUser(
  user: Pick<UserRecord, "id" | "name" | "email" | "role">
): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function getUserQueryExecutor(executor?: UserQueryExecutor) {
  return executor ?? getDbPool();
}

export async function findUserByEmail(email: string, executor?: UserQueryExecutor) {
  await ensureEmailVerificationSchema();
  const queryExecutor = getUserQueryExecutor(executor);
  const [rows] = await queryExecutor.execute<UserRecord[]>(
    `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash,
        role,
        email_verified_at,
        verification_token,
        verification_expires_at,
        created_at,
        updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email]
  );

  return rows[0] ?? null;
}

export async function findUserById(id: number, executor?: UserQueryExecutor) {
  await ensureEmailVerificationSchema();
  const queryExecutor = getUserQueryExecutor(executor);
  const [rows] = await queryExecutor.execute<UserRecord[]>(
    `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash,
        role,
        email_verified_at,
        verification_token,
        verification_expires_at,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ?? null;
}

export async function countUsers() {
  const pool = getDbPool();
  const [rows] = await pool.execute<(RowDataPacket & { total: number })[]>(
    "SELECT COUNT(*) AS total FROM users"
  );

  return rows[0]?.total ?? 0;
}

export async function listUsersForSuperadmin() {
  const pool = getDbPool();
  const [rows] = await pool.execute<SuperadminUserRecord[]>(
    `
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY
        CASE role
          WHEN 'superadmin' THEN 0
          WHEN 'admin' THEN 1
          ELSE 2
        END,
        created_at DESC
    `
  );

  return rows.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt:
      user.created_at instanceof Date
        ? user.created_at.toISOString()
        : new Date(user.created_at).toISOString(),
  }));
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  emailVerifiedAt?: Date | null;
  verificationToken?: string | null;
  verificationExpiresAt?: Date | null;
}, executor?: UserQueryExecutor) {
  await ensureEmailVerificationSchema();
  const queryExecutor = getUserQueryExecutor(executor);
  const [result] = await queryExecutor.execute<ResultSetHeader>(
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
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.name,
      input.email,
      input.passwordHash,
      input.role,
      input.emailVerifiedAt ?? null,
      input.verificationToken ?? null,
      input.verificationExpiresAt ?? null,
    ]
  );

  return {
    id: result.insertId,
    name: input.name,
    email: input.email,
    role: input.role,
    email_verified_at: input.emailVerifiedAt ?? null,
    verification_token: input.verificationToken ?? null,
    verification_expires_at: input.verificationExpiresAt ?? null,
  };
}

export async function findUserByVerificationToken(
  verificationToken: string,
  executor?: UserQueryExecutor
) {
  await ensureEmailVerificationSchema();
  const queryExecutor = getUserQueryExecutor(executor);
  const [rows] = await queryExecutor.execute<UserRecord[]>(
    `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash,
        role,
        email_verified_at,
        verification_token,
        verification_expires_at,
        created_at,
        updated_at
      FROM users
      WHERE verification_token = ?
      LIMIT 1
    `,
    [verificationToken]
  );

  return rows[0] ?? null;
}

export async function markUserEmailVerified(
  userId: number,
  executor?: UserQueryExecutor
) {
  await ensureEmailVerificationSchema();
  const queryExecutor = getUserQueryExecutor(executor);

  await queryExecutor.execute(
    `
      UPDATE users
      SET
        email_verified_at = NOW(),
        verification_token = NULL,
        verification_expires_at = NULL
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );
}

export async function updateUserProfile(input: {
  id: number;
  name: string;
  email: string;
  phone: string;
}, executor?: UserQueryExecutor) {
  const queryExecutor = getUserQueryExecutor(executor);

  await queryExecutor.execute(
    `
    UPDATE users
    SET name = ?, email = ?, phone = ?
    WHERE id = ?
    `,
    [input.name, input.email, input.phone, input.id]
  );
}
export async function updateUserRole(input: {
  id: number;
  role: Exclude<UserRole, "superadmin">;
}, executor?: UserQueryExecutor) {
  const queryExecutor = getUserQueryExecutor(executor);

  await queryExecutor.execute(
    `
      UPDATE users
      SET role = ?
      WHERE id = ?
      LIMIT 1
    `,
    [input.role, input.id]
  );
}
