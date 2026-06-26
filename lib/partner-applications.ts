import "server-only";

import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";

export type PartnerApplicationRow = RowDataPacket & {
  id: number;
  submitted_by_user_id: number;
  location: string;
  category: string;
  experience: string;
  portfolio_link: string;
  about_you: string;
  status: "pending" | "approved" | "rejected";
  created_at: Date;
  updated_at: Date;
  user_name: string;
  user_email: string;
  user_phone: string | null;
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
  submittedByUserId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePartnerApplicationInput = {
  location: string;
  category: string;
  experience: string;
  portfolioLink: string;
  aboutYou: string;
};

async function ensurePartnerApplicationsSchema() {
  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS partner_applications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      location VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,
      experience VARCHAR(100) NOT NULL,
      portfolio_link VARCHAR(255) NOT NULL,
      about_you TEXT NOT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      submitted_by_user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
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
    name: row.user_name,
    email: row.user_email,
    phone: row.user_phone ?? "",
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

const partnerApplicationSelect = `
  SELECT
    a.id,
    a.location,
    a.category,
    a.experience,
    a.portfolio_link,
    a.about_you,
    a.status,
    a.submitted_by_user_id,
    a.created_at,
    a.updated_at,
    u.name AS user_name,
    u.email AS user_email,
    u.phone AS user_phone
  FROM partner_applications a
  INNER JOIN users u ON u.id = a.submitted_by_user_id
`;

export async function createPartnerApplication(
  input: CreatePartnerApplicationInput,
  userId: number
) {
  await ensurePartnerApplicationsSchema();

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO partner_applications (
        location,
        category,
        experience,
        portfolio_link,
        about_you,
        submitted_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      input.location,
      input.category,
      input.experience,
      input.portfolioLink,
      input.aboutYou,
      userId,
    ]
  );

  const application = await getPartnerApplicationById(result.insertId);

  if (!application) {
    throw new Error("Failed to reload created partner application.");
  }

  return application;
}

export async function listPartnerApplications(status?: string) {
  await ensurePartnerApplicationsSchema();

  const pool = getDbPool();
  let query = partnerApplicationSelect;
  const params: string[] = [];

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query += ` WHERE a.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY a.created_at DESC`;

  const [rows] = await pool.execute<PartnerApplicationRow[]>(query, params);

  return rows.map(normalizeApplicationRow);
}

export async function getPartnerApplicationById(id: number) {
  await ensurePartnerApplicationsSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<PartnerApplicationRow[]>(
    `
      ${partnerApplicationSelect}
      WHERE a.id = ?
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
