import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";

export type UserRole = "admin" | "user";

export type UserRecord = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
};

export type SafeUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
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

export async function countUsers() {
  const pool = getDbPool();
  const [rows] = await pool.execute<(RowDataPacket & { total: number })[]>(
    "SELECT COUNT(*) AS total FROM users"
  );

  return rows[0]?.total ?? 0;
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
