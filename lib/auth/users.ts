import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";

export type UserRole = "superadmin" | "admin" | "user";

export type UserRecord = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
};

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

export async function findUserByEmail(email: string) {
  const pool = getDbPool();
  const [rows] = await pool.execute<UserRecord[]>(
    `
      SELECT id, name, email, password_hash, role
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email]
  );

  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  const pool = getDbPool();
  const [rows] = await pool.execute<UserRecord[]>(
    `
      SELECT id, name, email, password_hash, role, created_at, updated_at
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
}) {
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `,
    [input.name, input.email, input.passwordHash, input.role]
  );

  return {
    id: result.insertId,
    name: input.name,
    email: input.email,
    role: input.role,
  };
}

export async function updateUserProfile(input: {
  id: number;
  name: string;
  email: string;
  phone: string;
}) {
  const pool = getDbPool();

  await pool.execute(
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
}) {
  const pool = getDbPool();

  await pool.execute(
    `
      UPDATE users
      SET role = ?
      WHERE id = ?
      LIMIT 1
    `,
    [input.role, input.id]
  );
}