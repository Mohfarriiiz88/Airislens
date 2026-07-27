import "server-only";

import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";

const PROFILE_PHOTO_PLACEHOLDERS = [
  "/svg/fg1.svg",
  "/svg/fg2.svg",
  "/svg/fg3.svg",
  "/svg/fg4.svg",
];

export type PartnerType = "individual" | "studio";

type PartnerProfileRow = RowDataPacket & {
  user_id: number;
  email: string;
  brand_name: string;
  slug: string;
  description: string;
  specializations_json: string;
  address: string;
  whatsapp: string;
  latitude: number | null;
  longitude: number | null;
  free_distance_km: number;
  transport_fee_per_km: number;
  partner_type: PartnerType;
  team_quota: number;
  instagram: string;
  tiktok: string;
  facebook: string;
  website: string;
  profile_photo_url: string;
};

type PartnerGalleryRow = RowDataPacket & {
  id: number;
  user_id: number;
  title: string;
  category: string;
  image_url: string;
};

type PartnerCategoryRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  slug: string;
};

type PartnerPackageRow = RowDataPacket & {
  id: number;
  user_id: number;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  name: string;
  duration: string;
  price: number;
  description: string;
};

type AdminUserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
};

export type AdminPartnerProfile = {
  userId: number;
  accountEmail: string;
  brandName: string;
  slug: string;
  description: string;
  specializations: string[];
  address: string;
  whatsapp: string;
  latitude: number | null;
  longitude: number | null;
  freeDistanceKm: number;
  transportFeePerKm: number;
  partnerType: PartnerType;
  teamQuota: number;
  instagram: string;
  tiktok: string;
  facebook: string;
  website: string;
  profilePhotoUrl: string;
};

export type PartnerGalleryItem = {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
};

export type PartnerCategory = {
  id: number;
  name: string;
  slug: string;
};

export type PartnerPackage = {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  name: string;
  duration: string;
  price: number;
  description: string;
};

type PartnerPackageInput = {
  categoryId: number;
  name: string;
  duration: string;
  price: number;
  description: string;
};

export type PublicPartnerCard = {
  userId: number;
  slug: string;
  brandName: string;
  category: string;
  categories: PartnerCategory[];
  imageUrl: string;
};

export type PublicPartnerDetail = {
  userId: number;
  slug: string;
  brandName: string;
  description: string;
  specializations: string[];
  address: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  website: string;
  profilePhotoUrl: string;
  gallery: PartnerGalleryItem[];
  categories: PartnerCategory[];
  packages: PartnerPackage[];
};

export type PublicPartnerKnowledge = {
  userId: number;
  slug: string;
  brandName: string;
  category: string;
  description: string;
  specializations: string[];
  address: string;
  whatsapp: string;
  categories: PartnerCategory[];
  packages: PartnerPackage[];
};

export type PartnerBookingProfile = {
  userId: number;
  brandName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  freeDistanceKm: number;
  transportFeePerKm: number;
  partnerType: PartnerType;
  teamQuota: number;
};

declare global {
  var __airislensPartnerCmsReady: Promise<void> | undefined;
  var __airislensPartnerCmsSchemaVersion: number | undefined;
}

const PARTNER_CMS_SCHEMA_VERSION = 2;

function parseSpecializations(value: string) {
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

function stringifySpecializations(values: string[]) {
  return JSON.stringify(values.filter(Boolean));
}

function normalizePartnerType(value: string | null | undefined): PartnerType {
  return value === "studio" ? "studio" : "individual";
}

function normalizeTeamQuota(value: number | null | undefined) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 1) {
    return 1;
  }

  return numericValue;
}

function normalizeCategoryRow(row: PartnerCategoryRow): PartnerCategory {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
  };
}

function normalizePackageRow(row: PartnerPackageRow): PartnerPackage {
  return {
    id: Number(row.id),
    categoryId: row.category_id === null ? null : Number(row.category_id),
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    name: row.name,
    duration: row.duration,
    price: Number(row.price),
    description: row.description,
  };
}

function normalizeProfileRow(row: PartnerProfileRow): AdminPartnerProfile {
  return {
    userId: row.user_id,
    accountEmail: row.email,
    brandName: row.brand_name,
    slug: row.slug,
    description: row.description,
    specializations: parseSpecializations(row.specializations_json),
    address: row.address,
    whatsapp: row.whatsapp,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    freeDistanceKm: Number(row.free_distance_km ?? 5),
    transportFeePerKm: Number(row.transport_fee_per_km ?? 3000),
    partnerType: normalizePartnerType(row.partner_type),
    teamQuota: normalizeTeamQuota(row.team_quota),
    instagram: row.instagram,
    tiktok: row.tiktok,
    facebook: row.facebook,
    website: row.website,
    profilePhotoUrl: row.profile_photo_url,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export class PartnerCategoryInUseError extends Error {
  constructor() {
    super("Kategori masih memiliki paket aktif. Pindahkan atau hapus paketnya terlebih dahulu.");
    this.name = "PartnerCategoryInUseError";
  }
}

export class PartnerCategoryValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PartnerCategoryValidationError";
    this.status = status;
  }
}

async function generateUniqueSlug(baseValue: string, excludeUserId?: number) {
  const pool = getDbPool();
  const baseSlug = slugify(baseValue) || "partner";
  let counter = 0;

  while (true) {
    const candidate = counter === 0 ? baseSlug : `${baseSlug}-${counter}`;
    const [rows] = await pool.execute<(RowDataPacket & { user_id: number })[]>(
      `
        SELECT user_id
        FROM partner_profiles
        WHERE slug = ?
        LIMIT 1
      `,
      [candidate]
    );
    const existing = rows[0];

    if (!existing || existing.user_id === excludeUserId) {
      return candidate;
    }

    counter += 1;
  }
}

async function generateUniqueCategorySlug(
  userId: number,
  baseValue: string,
  excludeCategoryId?: number
) {
  const pool = getDbPool();
  const baseSlug = slugify(baseValue) || "general";
  let counter = 0;

  while (true) {
    const candidate = counter === 0 ? baseSlug : `${baseSlug}-${counter}`;
    const [rows] = await pool.execute<
      (RowDataPacket & { id: number })[]
    >(
      `
        SELECT id
        FROM partner_categories
        WHERE user_id = ?
          AND slug = ?
        LIMIT 1
      `,
      [userId, candidate]
    );
    const existing = rows[0];

    if (!existing || existing.id === excludeCategoryId) {
      return candidate;
    }

    counter += 1;
  }
}

async function ensureSchemaInternal() {
  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS partner_profiles (
      user_id BIGINT UNSIGNED NOT NULL,
      slug VARCHAR(191) NOT NULL,
      brand_name VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      specializations_json TEXT NOT NULL,
      address TEXT NOT NULL,
      whatsapp VARCHAR(30) NOT NULL,
      latitude DECIMAL(10,8) NULL,
      longitude DECIMAL(11,8) NULL,
      free_distance_km DECIMAL(8,2) NOT NULL DEFAULT 5.00,
      transport_fee_per_km BIGINT UNSIGNED NOT NULL DEFAULT 3000,
      partner_type ENUM('individual', 'studio') NOT NULL DEFAULT 'individual',
      team_quota INT UNSIGNED NOT NULL DEFAULT 1,
      instagram VARCHAR(191) NOT NULL DEFAULT '',
      tiktok VARCHAR(191) NOT NULL DEFAULT '',
      facebook VARCHAR(191) NOT NULL DEFAULT '',
      website VARCHAR(191) NOT NULL DEFAULT '',
      profile_photo_url VARCHAR(255) NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      UNIQUE KEY partner_profiles_slug_unique (slug)
    )
  `);

  const partnerProfileColumns = [
    {
      name: "latitude",
      definition: "DECIMAL(10,8) NULL AFTER whatsapp",
    },
    {
      name: "longitude",
      definition: "DECIMAL(11,8) NULL AFTER latitude",
    },
    {
      name: "free_distance_km",
      definition: "DECIMAL(8,2) NOT NULL DEFAULT 5.00 AFTER longitude",
    },
    {
      name: "transport_fee_per_km",
      definition:
        "BIGINT UNSIGNED NOT NULL DEFAULT 3000 AFTER free_distance_km",
    },
    {
      name: "partner_type",
      definition:
        "ENUM('individual', 'studio') NOT NULL DEFAULT 'individual' AFTER transport_fee_per_km",
    },
    {
      name: "team_quota",
      definition: "INT UNSIGNED NOT NULL DEFAULT 1 AFTER partner_type",
    },
    {
      name: "commission_rate",
      definition: "DECIMAL(5,2) NOT NULL DEFAULT 10.00 AFTER team_quota",
    },
  ] as const;

  for (const column of partnerProfileColumns) {
    const [rows] = await pool.execute<(RowDataPacket & { COLUMN_NAME: string })[]>(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'partner_profiles'
          AND COLUMN_NAME = ?
        LIMIT 1
      `,
      [column.name]
    );

    if (rows.length === 0) {
      await pool.execute(`
        ALTER TABLE partner_profiles
        ADD COLUMN ${column.name} ${column.definition}
      `);
    }
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS partner_gallery_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY partner_gallery_items_user_id_idx (user_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS partner_categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(50) NOT NULL,
      slug VARCHAR(80) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY partner_categories_user_slug_unique (user_id, slug),
      KEY partner_categories_user_id_idx (user_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS partner_packages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      category_id BIGINT UNSIGNED NULL,
      name VARCHAR(100) NOT NULL,
      duration VARCHAR(100) NOT NULL,
      price BIGINT UNSIGNED NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY partner_packages_user_id_idx (user_id),
      KEY partner_packages_category_id_idx (category_id)
    )
  `);

  const partnerPackageColumns = [
    {
      name: "category_id",
      definition: "BIGINT UNSIGNED NULL AFTER user_id",
    },
  ] as const;

  for (const column of partnerPackageColumns) {
    const [rows] = await pool.execute<
      (RowDataPacket & { COLUMN_NAME: string })[]
    >(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'partner_packages'
          AND COLUMN_NAME = ?
        LIMIT 1
      `,
      [column.name]
    );

    if (rows.length === 0) {
      await pool.execute(`
        ALTER TABLE partner_packages
        ADD COLUMN ${column.name} ${column.definition}
      `);
    }
  }

  const packageIndexes = [
    {
      name: "partner_packages_category_id_idx",
      definition: "ADD KEY partner_packages_category_id_idx (category_id)",
    },
  ] as const;

  for (const index of packageIndexes) {
    const [rows] = await pool.execute<
      (RowDataPacket & { INDEX_NAME: string })[]
    >(
      `
        SELECT INDEX_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'partner_packages'
          AND INDEX_NAME = ?
        LIMIT 1
      `,
      [index.name]
    );

    if (rows.length === 0) {
      await pool.execute(`
        ALTER TABLE partner_packages
        ${index.definition}
      `);
    }
  }

  await pool.execute(`
    INSERT INTO partner_categories (user_id, name, slug)
    SELECT source.user_id, 'General', 'general'
    FROM (
      SELECT DISTINCT user_id
      FROM partner_packages
    ) source
    LEFT JOIN partner_categories existing
      ON existing.user_id = source.user_id
      AND existing.slug = 'general'
    WHERE existing.id IS NULL
  `);

  await pool.execute(`
    UPDATE partner_packages pkg
    INNER JOIN partner_categories cat
      ON cat.user_id = pkg.user_id
      AND cat.slug = 'general'
    SET pkg.category_id = cat.id
    WHERE pkg.category_id IS NULL
  `);
}

export async function ensurePartnerCmsSchema() {
  if (
    !global.__airislensPartnerCmsReady ||
    global.__airislensPartnerCmsSchemaVersion !== PARTNER_CMS_SCHEMA_VERSION
  ) {
    global.__airislensPartnerCmsReady = ensureSchemaInternal().catch((error) => {
      global.__airislensPartnerCmsReady = undefined;
      global.__airislensPartnerCmsSchemaVersion = undefined;
      throw error;
    });
    global.__airislensPartnerCmsSchemaVersion = PARTNER_CMS_SCHEMA_VERSION;
  }

  return global.__airislensPartnerCmsReady;
}

async function ensurePartnerProfileForAdminUser(user: AdminUserRow) {
  const pool = getDbPool();
  const [rows] = await pool.execute<(RowDataPacket & { user_id: number })[]>(
    `
      SELECT user_id
      FROM partner_profiles
      WHERE user_id = ?
      LIMIT 1
    `,
    [user.id]
  );

  if (rows[0]) {
    return;
  }

  const slug = await generateUniqueSlug(user.name || `partner-${user.id}`);

  await pool.execute(
    `
      INSERT INTO partner_profiles (
        user_id,
        slug,
        brand_name,
        description,
        specializations_json,
        address,
        whatsapp,
        partner_type,
        team_quota,
        instagram,
        tiktok,
        facebook,
        website,
        profile_photo_url
      )
      VALUES (?, ?, ?, '', '[]', '', '', 'individual', 1, '', '', '', '', '')
    `,
    [user.id, slug, user.name]
  );
}

export async function ensurePartnerProfilesForAdmins() {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<AdminUserRow[]>(
    `
      SELECT id, name, email
      FROM users
      WHERE role = 'admin'
      ORDER BY id ASC
    `
  );

  for (const user of rows) {
    await ensurePartnerProfileForAdminUser(user);
  }
}

async function getAdminUser(userId: number) {
  const pool = getDbPool();
  const [rows] = await pool.execute<AdminUserRow[]>(
    `
      SELECT id, name, email
      FROM users
      WHERE id = ?
        AND role = 'admin'
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] ?? null;
}

export async function getAdminPartnerProfile(userId: number) {
  await ensurePartnerCmsSchema();

  const adminUser = await getAdminUser(userId);

  if (!adminUser) {
    return null;
  }

  await ensurePartnerProfileForAdminUser(adminUser);

  const pool = getDbPool();
  const [rows] = await pool.execute<PartnerProfileRow[]>(
    `
      SELECT
        p.user_id,
        u.email,
        p.brand_name,
        p.slug,
        p.description,
        p.specializations_json,
        p.address,
        p.whatsapp,
        p.latitude,
        p.longitude,
        p.free_distance_km,
        p.transport_fee_per_km,
        p.partner_type,
        p.team_quota,
        p.instagram,
        p.tiktok,
        p.facebook,
        p.website,
        p.profile_photo_url
      FROM partner_profiles p
      INNER JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  const row = rows[0];

  return row ? normalizeProfileRow(row) : null;
}

export async function upsertAdminPartnerProfile(
  userId: number,
  input: Omit<AdminPartnerProfile, "userId" | "accountEmail" | "slug">
) {
  await ensurePartnerCmsSchema();

  const adminUser = await getAdminUser(userId);

  if (!adminUser) {
    return null;
  }

  await ensurePartnerProfileForAdminUser(adminUser);

  const currentProfile = await getAdminPartnerProfile(userId);
  const slug = await generateUniqueSlug(input.brandName || adminUser.name, userId);
  const pool = getDbPool();
  const partnerType = normalizePartnerType(input.partnerType);
  const teamQuota =
    partnerType === "individual" ? 1 : normalizeTeamQuota(input.teamQuota);

  await pool.execute(
    `
      UPDATE partner_profiles
      SET
        slug = ?,
        brand_name = ?,
        description = ?,
        specializations_json = ?,
        address = ?,
        whatsapp = ?,
        latitude = ?,
        longitude = ?,
        free_distance_km = ?,
        transport_fee_per_km = ?,
        partner_type = ?,
        team_quota = ?,
        instagram = ?,
        tiktok = ?,
        facebook = ?,
        website = ?,
        profile_photo_url = ?
      WHERE user_id = ?
      LIMIT 1
    `,
    [
      slug,
      input.brandName,
      input.description,
      stringifySpecializations(input.specializations),
      input.address,
      input.whatsapp,
      input.latitude,
      input.longitude,
      input.freeDistanceKm,
      input.transportFeePerKm,
      partnerType,
      teamQuota,
      input.instagram,
      input.tiktok,
      input.facebook,
      input.website,
      input.profilePhotoUrl,
      userId,
    ]
  );

  return {
    userId,
    accountEmail: adminUser.email,
    brandName: input.brandName,
    slug,
    description: input.description,
    specializations: input.specializations,
    address: input.address,
    whatsapp: input.whatsapp,
    latitude: input.latitude,
    longitude: input.longitude,
    freeDistanceKm: input.freeDistanceKm,
    transportFeePerKm: input.transportFeePerKm,
    partnerType,
    teamQuota,
    instagram: input.instagram,
    tiktok: input.tiktok,
    facebook: input.facebook,
    website: input.website,
    profilePhotoUrl: input.profilePhotoUrl || currentProfile?.profilePhotoUrl || "",
  };
}

export async function getPartnerBookingProfile(userId: number) {
  await ensurePartnerProfilesForAdmins();

  const pool = getDbPool();
  const [rows] = await pool.execute<PartnerProfileRow[]>(
    `
      SELECT
        p.user_id,
        u.email,
        p.brand_name,
        p.slug,
        p.description,
        p.specializations_json,
        p.address,
        p.whatsapp,
        p.latitude,
        p.longitude,
        p.free_distance_km,
        p.transport_fee_per_km,
        p.partner_type,
        p.team_quota,
        p.instagram,
        p.tiktok,
        p.facebook,
        p.website,
        p.profile_photo_url
      FROM partner_profiles p
      INNER JOIN users u ON u.id = p.user_id
      WHERE u.role = 'admin'
        AND p.user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    brandName: row.brand_name,
    address: row.address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    freeDistanceKm: Number(row.free_distance_km ?? 5),
    transportFeePerKm: Number(row.transport_fee_per_km ?? 3000),
    partnerType: normalizePartnerType(row.partner_type),
    teamQuota: normalizeTeamQuota(row.team_quota),
  } satisfies PartnerBookingProfile;
}

export async function listPartnerGalleryItems(userId: number) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<PartnerGalleryRow[]>(
    `
      SELECT id, user_id, title, category, image_url
      FROM partner_gallery_items
      WHERE user_id = ?
      ORDER BY id DESC
    `,
    [userId]
  );

  return rows.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    imageUrl: item.image_url,
  }));
}

export async function createPartnerGalleryItem(
  userId: number,
  input: Omit<PartnerGalleryItem, "id">
) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO partner_gallery_items (user_id, title, category, image_url)
      VALUES (?, ?, ?, ?)
    `,
    [userId, input.title, input.category, input.imageUrl]
  );

  return {
    id: Number(result.insertId),
    ...input,
  };
}

export async function updatePartnerGalleryItem(
  userId: number,
  itemId: number,
  input: Omit<PartnerGalleryItem, "id">
) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  await pool.execute(
    `
      UPDATE partner_gallery_items
      SET title = ?, category = ?, image_url = ?
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [input.title, input.category, input.imageUrl, itemId, userId]
  );
}

export async function deletePartnerGalleryItem(userId: number, itemId: number) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  await pool.execute(
    `
      DELETE FROM partner_gallery_items
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [itemId, userId]
  );
}

export async function listPartnerCategories(userId: number) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<PartnerCategoryRow[]>(
    `
      SELECT id, user_id, name, slug
      FROM partner_categories
      WHERE user_id = ?
      ORDER BY name ASC, id ASC
    `,
    [userId]
  );

  return rows.map(normalizeCategoryRow);
}

export async function createPartnerCategory(
  userId: number,
  input: { name: string }
) {
  await ensurePartnerCmsSchema();

  const name = input.name.trim();

  if (!name) {
    throw new PartnerCategoryValidationError("Nama kategori wajib diisi.");
  }

  const slug = await generateUniqueCategorySlug(userId, name);
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO partner_categories (user_id, name, slug)
      VALUES (?, ?, ?)
    `,
    [userId, name, slug]
  );

  return {
    id: Number(result.insertId),
    name,
    slug,
  } satisfies PartnerCategory;
}

export async function updatePartnerCategory(
  userId: number,
  categoryId: number,
  input: { name: string }
) {
  await ensurePartnerCmsSchema();

  const name = input.name.trim();

  if (!name) {
    throw new PartnerCategoryValidationError("Nama kategori wajib diisi.");
  }

  const slug = await generateUniqueCategorySlug(userId, name, categoryId);
  const pool = getDbPool();
  await pool.execute(
    `
      UPDATE partner_categories
      SET name = ?, slug = ?
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [name, slug, categoryId, userId]
  );

  return {
    id: categoryId,
    name,
    slug,
  } satisfies PartnerCategory;
}

export async function deletePartnerCategory(userId: number, categoryId: number) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const [usageRows] = await pool.execute<
    (RowDataPacket & { package_count: number })[]
  >(
    `
      SELECT COUNT(*) AS package_count
      FROM partner_packages
      WHERE user_id = ?
        AND category_id = ?
    `,
    [userId, categoryId]
  );

  if (Number(usageRows[0]?.package_count ?? 0) > 0) {
    throw new PartnerCategoryInUseError();
  }

  await pool.execute(
    `
      DELETE FROM partner_categories
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [categoryId, userId]
  );
}

export async function listPartnerPackages(
  userId: number,
  categoryId?: number | null
) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const params: number[] = [userId];
  let categoryClause = "";

  if (typeof categoryId === "number" && Number.isInteger(categoryId) && categoryId > 0) {
    categoryClause = "AND pkg.category_id = ?";
    params.push(categoryId);
  }

  const [rows] = await pool.execute<PartnerPackageRow[]>(
    `
      SELECT
        pkg.id,
        pkg.user_id,
        pkg.category_id,
        cat.name AS category_name,
        cat.slug AS category_slug,
        pkg.name,
        pkg.duration,
        pkg.price,
        pkg.description
      FROM partner_packages pkg
      LEFT JOIN partner_categories cat
        ON cat.id = pkg.category_id
       AND cat.user_id = pkg.user_id
      WHERE pkg.user_id = ?
      ${categoryClause}
      ORDER BY cat.name ASC, pkg.id DESC
    `,
    params
  );

  return rows.map(normalizePackageRow);
}

export async function createPartnerPackage(
  userId: number,
  input: PartnerPackageInput
) {
  await ensurePartnerCmsSchema();

  if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
    throw new PartnerCategoryValidationError("Paket harus terhubung dengan kategori.");
  }

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO partner_packages (
        user_id,
        category_id,
        name,
        duration,
        price,
        description
      )
      SELECT ?, ?, ?, ?, ?, ?
      FROM partner_categories
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [
      userId,
      input.categoryId,
      input.name,
      input.duration,
      input.price,
      input.description,
      input.categoryId,
      userId,
    ]
  );

  if (!result.insertId) {
    throw new PartnerCategoryValidationError(
      "Kategori paket tidak valid untuk fotografer ini.",
      400
    );
  }

  const packages = await listPartnerPackages(userId);
  const createdPackage = packages.find((item) => item.id === Number(result.insertId));

  if (!createdPackage) {
    throw new Error("Paket berhasil dibuat tetapi gagal dimuat ulang.");
  }

  return createdPackage;
}

export async function updatePartnerPackage(
  userId: number,
  packageId: number,
  input: PartnerPackageInput
) {
  await ensurePartnerCmsSchema();

  if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
    throw new PartnerCategoryValidationError("Paket harus terhubung dengan kategori.");
  }

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      UPDATE partner_packages pkg
      INNER JOIN partner_categories cat
        ON cat.id = ?
       AND cat.user_id = pkg.user_id
      SET
        pkg.category_id = ?,
        pkg.name = ?,
        pkg.duration = ?,
        pkg.price = ?,
        pkg.description = ?
      WHERE pkg.id = ?
        AND pkg.user_id = ?
      LIMIT 1
    `,
    [
      input.categoryId,
      input.categoryId,
      input.name,
      input.duration,
      input.price,
      input.description,
      packageId,
      userId,
    ]
  );

  if (result.affectedRows === 0) {
    throw new PartnerCategoryValidationError(
      "Kategori paket tidak valid untuk fotografer ini.",
      400
    );
  }

  const packages = await listPartnerPackages(userId);
  const updatedPackage = packages.find((item) => item.id === packageId);

  if (!updatedPackage) {
    throw new Error("Paket berhasil diperbarui tetapi gagal dimuat ulang.");
  }

  return updatedPackage;
}

export async function deletePartnerPackage(userId: number, packageId: number) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  await pool.execute(
    `
      DELETE FROM partner_packages
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [packageId, userId]
  );
}

export async function listPublicPartners() {
  await ensurePartnerProfilesForAdmins();

  const pool = getDbPool();
  const [[profileRows], [galleryRows], [categoryRows]] = await Promise.all([
    pool.execute<PartnerProfileRow[]>(
      `
        SELECT
          p.user_id,
          u.email,
          p.brand_name,
          p.slug,
          p.description,
          p.specializations_json,
          p.address,
          p.whatsapp,
          p.instagram,
          p.tiktok,
          p.facebook,
          p.website,
          p.profile_photo_url
        FROM partner_profiles p
        INNER JOIN users u ON u.id = p.user_id
        WHERE u.role = 'admin'
        ORDER BY p.brand_name ASC
      `
    ),
    pool.execute<PartnerGalleryRow[]>(
      `
        SELECT id, user_id, title, category, image_url
        FROM partner_gallery_items
        ORDER BY user_id ASC, id ASC
      `
    ),
    pool.execute<PartnerCategoryRow[]>(
      `
        SELECT id, user_id, name, slug
        FROM partner_categories
        ORDER BY user_id ASC, name ASC, id ASC
      `
    ),
  ]);

  const firstGalleryImageByUser = new Map<number, string>();
  const categoriesByUserId = new Map<number, PartnerCategory[]>();

  for (const item of galleryRows) {
    if (!firstGalleryImageByUser.has(item.user_id)) {
      firstGalleryImageByUser.set(item.user_id, item.image_url);
    }
  }

  for (const row of categoryRows) {
    const currentCategories = categoriesByUserId.get(row.user_id) ?? [];
    currentCategories.push(normalizeCategoryRow(row));
    categoriesByUserId.set(row.user_id, currentCategories);
  }

  return profileRows.map((profile, index) => {
    const specializations = parseSpecializations(profile.specializations_json);
    const categories = categoriesByUserId.get(profile.user_id) ?? [];

    return {
      userId: profile.user_id,
      slug: profile.slug,
      brandName: profile.brand_name,
      category: categories[0]?.name || specializations[0] || "General",
      categories,
      imageUrl:
        profile.profile_photo_url ||
        firstGalleryImageByUser.get(profile.user_id) ||
        PROFILE_PHOTO_PLACEHOLDERS[index % PROFILE_PHOTO_PLACEHOLDERS.length],
    };
  });
}

export async function getPublicPartnerDetailBySlug(slug: string) {
  await ensurePartnerProfilesForAdmins();

  const pool = getDbPool();
  const [profileRows] = await pool.execute<PartnerProfileRow[]>(
    `
      SELECT
        p.user_id,
        u.email,
        p.brand_name,
        p.slug,
        p.description,
        p.specializations_json,
        p.address,
        p.whatsapp,
        p.instagram,
        p.tiktok,
        p.facebook,
        p.website,
        p.profile_photo_url
      FROM partner_profiles p
      INNER JOIN users u ON u.id = p.user_id
      WHERE u.role = 'admin'
        AND p.slug = ?
      LIMIT 1
    `,
    [slug]
  );

  const profile = profileRows[0];

  if (!profile) {
    return null;
  }

  const gallery = await listPartnerGalleryItems(profile.user_id);
  const categories = await listPartnerCategories(profile.user_id);
  const packages = await listPartnerPackages(profile.user_id);
  const specializations = parseSpecializations(profile.specializations_json);

  return {
    userId: profile.user_id,
    slug: profile.slug,
    brandName: profile.brand_name,
    description: profile.description,
    specializations,
    address: profile.address,
    whatsapp: profile.whatsapp,
    instagram: profile.instagram,
    tiktok: profile.tiktok,
    facebook: profile.facebook,
    website: profile.website,
    profilePhotoUrl:
      profile.profile_photo_url ||
      gallery[0]?.imageUrl ||
      PROFILE_PHOTO_PLACEHOLDERS[profile.user_id % PROFILE_PHOTO_PLACEHOLDERS.length],
    gallery,
    categories,
    packages,
  };
}

export async function listPublicPartnerKnowledge() {
  await ensurePartnerProfilesForAdmins();

  const pool = getDbPool();
  const [[profileRows], [packageRows], [categoryRows]] = await Promise.all([
    pool.execute<PartnerProfileRow[]>(`
        SELECT
          p.user_id,
          u.email,
          p.brand_name,
          p.slug,
          p.description,
          p.specializations_json,
          p.address,
          p.whatsapp,
          p.instagram,
          p.tiktok,
          p.facebook,
          p.website,
          p.profile_photo_url
        FROM partner_profiles p
        INNER JOIN users u ON u.id = p.user_id
        WHERE u.role = 'admin'
        ORDER BY p.brand_name ASC
      `),
    pool.execute<PartnerPackageRow[]>(`
        SELECT
          pkg.id,
          pkg.user_id,
          pkg.category_id,
          cat.name AS category_name,
          cat.slug AS category_slug,
          pkg.name,
          pkg.duration,
          pkg.price,
          pkg.description
        FROM partner_packages pkg
        LEFT JOIN partner_categories cat
          ON cat.id = pkg.category_id
         AND cat.user_id = pkg.user_id
        ORDER BY pkg.user_id ASC, cat.name ASC, pkg.id ASC
      `),
    pool.execute<PartnerCategoryRow[]>(`
        SELECT id, user_id, name, slug
        FROM partner_categories
        ORDER BY user_id ASC, name ASC, id ASC
      `),
  ]);

  const packagesByUserId = new Map<number, PartnerPackage[]>();
  const categoriesByUserId = new Map<number, PartnerCategory[]>();

  for (const row of packageRows) {
    const currentPackages = packagesByUserId.get(row.user_id) ?? [];

    currentPackages.push(normalizePackageRow(row));
    packagesByUserId.set(row.user_id, currentPackages);
  }

  for (const row of categoryRows) {
    const currentCategories = categoriesByUserId.get(row.user_id) ?? [];

    currentCategories.push(normalizeCategoryRow(row));
    categoriesByUserId.set(row.user_id, currentCategories);
  }

  return profileRows.map((profile) => {
    const specializations = parseSpecializations(profile.specializations_json);
    const categories = categoriesByUserId.get(profile.user_id) ?? [];

    return {
      userId: profile.user_id,
      slug: profile.slug,
      brandName: profile.brand_name,
      category: categories[0]?.name || specializations[0] || "General",
      description: profile.description,
      specializations,
      address: profile.address,
      whatsapp: profile.whatsapp,
      categories,
      packages: packagesByUserId.get(profile.user_id) ?? [],
    };
  });
}
