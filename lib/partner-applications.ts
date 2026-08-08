import "server-only";

import {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import {
  type PartnerApplicationKind,
  type PartnerApplicationStatus,
  getPartnerApplicationDeclarations,
} from "@/lib/partner-application-shared";

type DbExecutor = Pool | PoolConnection;

type PartnerApplicationRow = RowDataPacket & {
  id: number;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  partner_type: PartnerApplicationKind;
  location: string;
  domicile_city: string;
  address: string | null;
  brand_name: string;
  category: string;
  specializations_json: string | null;
  experience: string;
  instagram_url: string;
  portfolio_link: string;
  about_you: string;
  maps_url: string | null;
  website_url: string | null;
  established_year: number | null;
  studio_phone: string | null;
  declaration_items_json: string | null;
  declaration_accepted: number | boolean;
  declaration_accepted_at: Date | null;
  terms_accepted: number | boolean;
  terms_version: string | null;
  terms_accepted_at: Date | null;
  bank_name: string;
  bank_account_number: string;
  cv_file_url: string;
  status: PartnerApplicationStatus;
  rejection_reason: string | null;
  reviewed_at: Date | null;
  reviewed_by_user_id: number | null;
  submitted_by_user_id: number;
  created_at: Date;
  updated_at: Date;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  reviewer_name: string | null;
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
  status: PartnerApplicationStatus;
  submittedByUserId: number;
  createdAt: string;
  updatedAt: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  partnerType: PartnerApplicationKind;
  domicileCity: string;
  address: string;
  brandName: string;
  services: string[];
  instagramUrl: string;
  portfolioUrl: string;
  about: string;
  mapsUrl: string | null;
  websiteUrl: string | null;
  establishedYear: number | null;
  studioPhone: string;
  declarationAccepted: boolean;
  declarations: string[];
  declarationAcceptedAt: string | null;
  termsAccepted: boolean;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  bankName: string;
  bankAccountNumber: string;
  cvFileUrl: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedByUserId: number | null;
  reviewedByName: string | null;
};

export type CreatePartnerApplicationInput = {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  partnerType: PartnerApplicationKind;
  domicileCity: string;
  address: string;
  brandName: string;
  services: string[];
  experience: string;
  instagramUrl: string;
  portfolioUrl: string;
  about: string;
  mapsUrl?: string | null;
  websiteUrl?: string | null;
  establishedYear?: number | null;
  studioPhone?: string | null;
  declarations: string[];
  declarationAcceptedAt: Date;
  termsVersion: string;
  bankName: string;
  bankAccountNumber: string;
  cvFileUrl: string;
};

export type ReviewPartnerApplicationInput = {
  id: number;
  status: Extract<PartnerApplicationStatus, "approved" | "rejected">;
  reviewedByUserId: number;
  rejectionReason?: string | null;
};

declare global {
  var __airislensPartnerApplicationsReady: Promise<void> | undefined;
  var __airislensPartnerApplicationsSchemaVersion: number | undefined;
}

const PARTNER_APPLICATIONS_SCHEMA_VERSION = 4;

function getExecutor(executor?: DbExecutor) {
  return executor ?? getDbPool();
}

function parseJsonArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizePartnerType(value: string | null | undefined): PartnerApplicationKind {
  return value === "studio" ? "studio" : "individual";
}

function normalizeApplicationRow(row: PartnerApplicationRow): PartnerApplication {
  const partnerType = normalizePartnerType(row.partner_type);
  const services = parseJsonArray(row.specializations_json);
  const normalizedServices =
    services.length > 0
      ? services
      : row.category.trim()
        ? [row.category.trim()]
        : [];
  const applicantName = row.applicant_name.trim() || row.user_name;
  const applicantEmail = row.applicant_email.trim() || row.user_email;
  const applicantPhone = row.applicant_phone.trim() || row.user_phone || "";
  const domicileCity = row.domicile_city.trim() || row.location.trim();
  const declarations = parseJsonArray(row.declaration_items_json);

  return {
    id: Number(row.id),
    name: applicantName,
    email: applicantEmail,
    phone: applicantPhone,
    location: domicileCity,
    category: normalizedServices[0] ?? "",
    experience: row.experience,
    portfolioLink: row.portfolio_link,
    aboutYou: row.about_you,
    status: row.status,
    submittedByUserId: Number(row.submitted_by_user_id),
    createdAt: toIsoString(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date(0).toISOString(),
    applicantName,
    applicantEmail,
    applicantPhone,
    partnerType,
    domicileCity,
    address: row.address?.trim() || "",
    brandName: row.brand_name.trim(),
    services: normalizedServices,
    instagramUrl: row.instagram_url.trim(),
    portfolioUrl: row.portfolio_link.trim(),
    about: row.about_you,
    mapsUrl: row.maps_url?.trim() || null,
    websiteUrl: row.website_url?.trim() || null,
    establishedYear:
      row.established_year === null ? null : Number(row.established_year),
    studioPhone: row.studio_phone?.trim() || "",
    declarationAccepted: Boolean(row.declaration_accepted),
    declarations:
      declarations.length > 0
        ? declarations
        : Boolean(row.declaration_accepted)
          ? getPartnerApplicationDeclarations(partnerType)
          : [],
    declarationAcceptedAt: toIsoString(row.declaration_accepted_at),
    termsAccepted: Boolean(row.terms_accepted),
    termsVersion: row.terms_version?.trim() || null,
    termsAcceptedAt: toIsoString(row.terms_accepted_at),
    bankName: row.bank_name.trim(),
    bankAccountNumber: row.bank_account_number.trim(),
    cvFileUrl: row.cv_file_url.trim(),
    rejectionReason: row.rejection_reason?.trim() || null,
    reviewedAt: toIsoString(row.reviewed_at),
    reviewedByUserId:
      row.reviewed_by_user_id === null ? null : Number(row.reviewed_by_user_id),
    reviewedByName: row.reviewer_name?.trim() || null,
  };
}

async function columnExists(
  executor: DbExecutor,
  tableName: string,
  columnName: string
) {
  const [rows] = await executor.execute<(RowDataPacket & { COLUMN_NAME: string })[]>(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function indexExists(
  executor: DbExecutor,
  tableName: string,
  indexName: string
) {
  const [rows] = await executor.execute<(RowDataPacket & { INDEX_NAME: string })[]>(
    `
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName]
  );

  return rows.length > 0;
}

async function ensurePartnerApplicationsSchemaInternal() {
  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS partner_applications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      applicant_name VARCHAR(100) NOT NULL DEFAULT '',
      applicant_email VARCHAR(191) NOT NULL DEFAULT '',
      applicant_phone VARCHAR(30) NOT NULL DEFAULT '',
      partner_type ENUM('individual', 'studio') NOT NULL DEFAULT 'individual',
      location VARCHAR(100) NOT NULL,
      domicile_city VARCHAR(100) NOT NULL DEFAULT '',
      address TEXT NULL,
      brand_name VARCHAR(100) NOT NULL DEFAULT '',
      category VARCHAR(100) NOT NULL,
      specializations_json TEXT NULL,
      experience VARCHAR(100) NOT NULL,
      instagram_url VARCHAR(255) NOT NULL DEFAULT '',
      portfolio_link VARCHAR(255) NOT NULL,
      about_you TEXT NOT NULL,
      maps_url VARCHAR(255) NULL,
      website_url VARCHAR(255) NULL,
      established_year SMALLINT UNSIGNED NULL,
      studio_phone VARCHAR(30) NULL,
      declaration_items_json TEXT NULL,
      declaration_accepted TINYINT(1) NOT NULL DEFAULT 0,
      declaration_accepted_at DATETIME NULL,
      terms_accepted TINYINT(1) NOT NULL DEFAULT 0,
      terms_version VARCHAR(20) NULL,
      terms_accepted_at DATETIME NULL,
      bank_name VARCHAR(100) NOT NULL DEFAULT '',
      bank_account_number VARCHAR(30) NOT NULL DEFAULT '',
      cv_file_url VARCHAR(255) NOT NULL DEFAULT '',
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      rejection_reason TEXT NULL,
      reviewed_at DATETIME NULL,
      reviewed_by_user_id BIGINT UNSIGNED NULL,
      submitted_by_user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY partner_applications_status_idx (status),
      KEY partner_applications_user_id_idx (submitted_by_user_id),
      KEY partner_applications_partner_type_idx (partner_type),
      KEY partner_applications_reviewed_by_user_id_idx (reviewed_by_user_id)
    )
  `);

  const columnDefinitions = [
    "ADD COLUMN applicant_name VARCHAR(100) NOT NULL DEFAULT '' AFTER id",
    "ADD COLUMN applicant_email VARCHAR(191) NOT NULL DEFAULT '' AFTER applicant_name",
    "ADD COLUMN applicant_phone VARCHAR(30) NOT NULL DEFAULT '' AFTER applicant_email",
    "ADD COLUMN partner_type ENUM('individual', 'studio') NOT NULL DEFAULT 'individual' AFTER applicant_phone",
    "ADD COLUMN domicile_city VARCHAR(100) NOT NULL DEFAULT '' AFTER location",
    "ADD COLUMN address TEXT NULL AFTER domicile_city",
    "ADD COLUMN brand_name VARCHAR(100) NOT NULL DEFAULT '' AFTER address",
    "ADD COLUMN specializations_json TEXT NULL AFTER category",
    "ADD COLUMN instagram_url VARCHAR(255) NOT NULL DEFAULT '' AFTER experience",
    "ADD COLUMN maps_url VARCHAR(255) NULL AFTER about_you",
    "ADD COLUMN website_url VARCHAR(255) NULL AFTER maps_url",
    "ADD COLUMN established_year SMALLINT UNSIGNED NULL AFTER website_url",
    "ADD COLUMN studio_phone VARCHAR(30) NULL AFTER established_year",
    "ADD COLUMN declaration_items_json TEXT NULL AFTER studio_phone",
    "ADD COLUMN declaration_accepted TINYINT(1) NOT NULL DEFAULT 0 AFTER declaration_items_json",
    "ADD COLUMN declaration_accepted_at DATETIME NULL AFTER declaration_accepted",
    "ADD COLUMN terms_accepted TINYINT(1) NOT NULL DEFAULT 0 AFTER declaration_accepted_at",
    "ADD COLUMN terms_version VARCHAR(20) NULL AFTER terms_accepted",
    "ADD COLUMN terms_accepted_at DATETIME NULL AFTER terms_version",
    "ADD COLUMN bank_name VARCHAR(100) NOT NULL DEFAULT '' AFTER terms_accepted_at",
    "ADD COLUMN bank_account_number VARCHAR(30) NOT NULL DEFAULT '' AFTER bank_name",
    "ADD COLUMN cv_file_url VARCHAR(255) NOT NULL DEFAULT '' AFTER bank_account_number",
    "ADD COLUMN rejection_reason TEXT NULL AFTER status",
    "ADD COLUMN reviewed_at DATETIME NULL AFTER rejection_reason",
    "ADD COLUMN reviewed_by_user_id BIGINT UNSIGNED NULL AFTER reviewed_at",
  ] as const;

  const columnNames = [
    "applicant_name",
    "applicant_email",
    "applicant_phone",
    "partner_type",
    "domicile_city",
    "address",
    "brand_name",
    "specializations_json",
    "instagram_url",
    "maps_url",
    "website_url",
    "established_year",
    "studio_phone",
    "declaration_items_json",
    "declaration_accepted",
    "declaration_accepted_at",
    "terms_accepted",
    "terms_version",
    "terms_accepted_at",
    "bank_name",
    "bank_account_number",
    "cv_file_url",
    "rejection_reason",
    "reviewed_at",
    "reviewed_by_user_id",
  ] as const;

  for (let index = 0; index < columnNames.length; index += 1) {
    if (!(await columnExists(pool, "partner_applications", columnNames[index]))) {
      await pool.execute(`
        ALTER TABLE partner_applications
        ${columnDefinitions[index]}
      `);
    }
  }

  if (!(await indexExists(pool, "partner_applications", "partner_applications_partner_type_idx"))) {
    await pool.execute(`
      ALTER TABLE partner_applications
      ADD INDEX partner_applications_partner_type_idx (partner_type)
    `);
  }

  if (
    !(await indexExists(
      pool,
      "partner_applications",
      "partner_applications_reviewed_by_user_id_idx"
    ))
  ) {
    await pool.execute(`
      ALTER TABLE partner_applications
      ADD INDEX partner_applications_reviewed_by_user_id_idx (reviewed_by_user_id)
    `);
  }

  await pool.execute(`
    UPDATE partner_applications a
    INNER JOIN users u ON u.id = a.submitted_by_user_id
    SET
      a.applicant_name = CASE
        WHEN TRIM(a.applicant_name) = '' THEN u.name
        ELSE a.applicant_name
      END,
      a.applicant_email = CASE
        WHEN TRIM(a.applicant_email) = '' THEN u.email
        ELSE a.applicant_email
      END,
      a.applicant_phone = CASE
        WHEN TRIM(a.applicant_phone) = '' THEN COALESCE(u.phone, '')
        ELSE a.applicant_phone
      END,
      a.domicile_city = CASE
        WHEN TRIM(a.domicile_city) = '' THEN a.location
        ELSE a.domicile_city
      END,
      a.specializations_json = CASE
        WHEN a.specializations_json IS NULL OR TRIM(a.specializations_json) = ''
          THEN JSON_ARRAY(a.category)
        ELSE a.specializations_json
      END
  `);
}

export async function ensurePartnerApplicationsSchema() {
  if (
    !global.__airislensPartnerApplicationsReady ||
    global.__airislensPartnerApplicationsSchemaVersion !==
      PARTNER_APPLICATIONS_SCHEMA_VERSION
  ) {
    global.__airislensPartnerApplicationsReady =
      ensurePartnerApplicationsSchemaInternal().catch((error) => {
        global.__airislensPartnerApplicationsReady = undefined;
        global.__airislensPartnerApplicationsSchemaVersion = undefined;
        throw error;
      });
    global.__airislensPartnerApplicationsSchemaVersion =
      PARTNER_APPLICATIONS_SCHEMA_VERSION;
  }

  return global.__airislensPartnerApplicationsReady;
}

const partnerApplicationSelect = `
  SELECT
    a.id,
    a.applicant_name,
    a.applicant_email,
    a.applicant_phone,
    a.partner_type,
    a.location,
    a.domicile_city,
    a.address,
    a.brand_name,
    a.category,
    a.specializations_json,
    a.experience,
    a.instagram_url,
    a.portfolio_link,
    a.about_you,
    a.maps_url,
    a.website_url,
    a.established_year,
    a.studio_phone,
    a.declaration_items_json,
    a.declaration_accepted,
    a.declaration_accepted_at,
    a.terms_accepted,
    a.terms_version,
    a.terms_accepted_at,
    a.bank_name,
    a.bank_account_number,
    a.cv_file_url,
    a.status,
    a.rejection_reason,
    a.reviewed_at,
    a.reviewed_by_user_id,
    a.submitted_by_user_id,
    a.created_at,
    a.updated_at,
    u.name AS user_name,
    u.email AS user_email,
    u.phone AS user_phone,
    reviewer.name AS reviewer_name
  FROM partner_applications a
  INNER JOIN users u ON u.id = a.submitted_by_user_id
  LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by_user_id
`;

export async function findPendingPartnerApplicationByUserId(
  userId: number,
  executor?: DbExecutor
) {
  await ensurePartnerApplicationsSchema();

  const db = getExecutor(executor);
  const [rows] = await db.execute<PartnerApplicationRow[]>(
    `
      ${partnerApplicationSelect}
      WHERE a.submitted_by_user_id = ?
        AND a.status = 'pending'
      ORDER BY a.created_at DESC
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] ? normalizeApplicationRow(rows[0]) : null;
}

export async function createPartnerApplication(
  input: CreatePartnerApplicationInput,
  userId: number,
  executor?: DbExecutor
) {
  await ensurePartnerApplicationsSchema();

  const db = getExecutor(executor);
  const [result] = await db.execute<ResultSetHeader>(
    `
      INSERT INTO partner_applications (
        applicant_name,
        applicant_email,
        applicant_phone,
        partner_type,
        location,
        domicile_city,
        address,
        brand_name,
        category,
        specializations_json,
        experience,
        instagram_url,
        portfolio_link,
        about_you,
        maps_url,
        website_url,
        established_year,
        studio_phone,
        declaration_items_json,
        declaration_accepted,
        declaration_accepted_at,
        terms_accepted,
        terms_version,
        terms_accepted_at,
        bank_name,
        bank_account_number,
        cv_file_url,
        status,
        submitted_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?, CURRENT_TIMESTAMP, ?, ?, ?, 'pending', ?)
    `,
    [
      input.applicantName,
      input.applicantEmail,
      input.applicantPhone,
      input.partnerType,
      input.domicileCity,
      input.domicileCity,
      input.address,
      input.brandName,
      input.services[0] ?? "",
      JSON.stringify(input.services),
      input.experience,
      input.instagramUrl,
      input.portfolioUrl,
      input.about,
      input.mapsUrl ?? null,
      input.websiteUrl ?? null,
      input.establishedYear ?? null,
      input.studioPhone ?? null,
      JSON.stringify(input.declarations),
      input.declarationAcceptedAt,
      input.termsVersion,
      input.bankName,
      input.bankAccountNumber,
      input.cvFileUrl,
      userId,
    ]
  );

  const application = await getPartnerApplicationById(result.insertId, executor);

  if (!application) {
    throw new Error("Failed to reload created partner application.");
  }

  return application;
}

export async function listPartnerApplications(
  status?: PartnerApplicationStatus,
  executor?: DbExecutor
) {
  await ensurePartnerApplicationsSchema();

  const db = getExecutor(executor);
  let query = partnerApplicationSelect;
  const params: string[] = [];

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query += ` WHERE a.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY a.created_at DESC`;

  const [rows] = await db.execute<PartnerApplicationRow[]>(query, params);

  return rows.map(normalizeApplicationRow);
}

export async function getPartnerApplicationById(
  id: number,
  executor?: DbExecutor
) {
  await ensurePartnerApplicationsSchema();

  const db = getExecutor(executor);
  const [rows] = await db.execute<PartnerApplicationRow[]>(
    `
      ${partnerApplicationSelect}
      WHERE a.id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ? normalizeApplicationRow(rows[0]) : null;
}

export async function reviewPartnerApplication(
  input: ReviewPartnerApplicationInput,
  executor?: DbExecutor
) {
  await ensurePartnerApplicationsSchema();

  const db = getExecutor(executor);
  await db.execute(
    `
      UPDATE partner_applications
      SET
        status = ?,
        rejection_reason = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        reviewed_by_user_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      LIMIT 1
    `,
    [
      input.status,
      input.status === "rejected" ? input.rejectionReason?.trim() || null : null,
      input.reviewedByUserId,
      input.id,
    ]
  );

  return getPartnerApplicationById(input.id, executor);
}
