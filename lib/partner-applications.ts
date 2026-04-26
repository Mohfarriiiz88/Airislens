import "server-only";

import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { getDbPool } from "@/lib/db";

export type PartnerApplicationRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  category: string;
  experience: string;
  portfolio_link: string;
  about_you: string;
  status: "pending" | "approved" | "rejected";
  submitted_by_user_id: number | null;
  created_at: Date;
  updated_at: Date;
};

export type PartnerApplication = {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  category: string;
  experience: string;
  portfolioLink: string;
  aboutYou: string;
  status: "pending" | "approved" | "rejected";
  submittedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

async function ensurePartnerApplicationsSchema() {
  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS partner_applications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(191) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      location VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,
      experience VARCHAR(100) NOT NULL,
      portfolio_link VARCHAR(255) NOT NULL,
      about_you TEXT NOT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      submitted_by_user_id BIGINT UNSIGNED,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY partner_applications_email_idx (email),
      KEY partner_applications_status_idx (status),
      KEY partner_applications_user_id_idx (submitted_by_user_id)
    )
  `);
}

function normalizeApplicationRow(
  row: PartnerApplicationRow
): PartnerApplication {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    category: row.category,
    experience: row.experience,
    portfolioLink: row.portfolio_link,
    aboutYou: row.about_you,
    status: row.status,
    submittedByUserId: row.submitted_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createPartnerApplication(
  input: Omit<PartnerApplication, "id" | "status" | "createdAt" | "updatedAt">,
  userId?: number
) {
  await ensurePartnerApplicationsSchema();

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO partner_applications (
        name,
        email,
        phone,
        location,
        category,
        experience,
        portfolio_link,
        about_you,
        submitted_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.name,
      input.email,
      input.phone,
      input.location,
      input.category,
      input.experience,
      input.portfolioLink,
      input.aboutYou,
      userId ?? null,
    ]
  );

  return {
    id: result.insertId,
    ...input,
    status: "pending" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function listPartnerApplications(status?: string) {
  await ensurePartnerApplicationsSchema();

  const pool = getDbPool();

  let query = `
    SELECT id, name, email, phone, location, category, experience, 
           portfolio_link, about_you, status, submitted_by_user_id, 
           created_at, updated_at
    FROM partner_applications
  `;
  const params: string[] = [];

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query += ` WHERE status = ?`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC`;

  const [rows] = await pool.execute<PartnerApplicationRow[]>(query, params);

  return rows.map(normalizeApplicationRow);
}

export async function getPartnerApplicationById(id: number) {
  await ensurePartnerApplicationsSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<PartnerApplicationRow[]>(
    `
      SELECT id, name, email, phone, location, category, experience, 
             portfolio_link, about_you, status, submitted_by_user_id, 
             created_at, updated_at
      FROM partner_applications
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ? normalizeApplicationRow(rows[0]) : null;
}

export async function updatePartnerApplicationStatus(
  id: number,
  status: "pending" | "approved" | "rejected"
) {
  await ensurePartnerApplicationsSchema();

  const pool = getDbPool();
  await pool.execute(
    `
      UPDATE partner_applications
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [status, id]
  );

  return getPartnerApplicationById(id);
}
