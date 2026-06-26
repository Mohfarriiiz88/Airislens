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

type PartnerPackageRow = RowDataPacket & {
  id: number;
  user_id: number;
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

export type PartnerPackage = {
  id: number;
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
}

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
    CREATE TABLE IF NOT EXISTS partner_packages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(100) NOT NULL,
      duration VARCHAR(100) NOT NULL,
      price BIGINT UNSIGNED NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY partner_packages_user_id_idx (user_id)
    )
  `);
}

export async function ensurePartnerCmsSchema() {
  if (!global.__airislensPartnerCmsReady) {
    global.__airislensPartnerCmsReady = ensureSchemaInternal().catch((error) => {
      global.__airislensPartnerCmsReady = undefined;
      throw error;
    });
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

export async function listPartnerPackages(userId: number) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<PartnerPackageRow[]>(
    `
      SELECT id, user_id, name, duration, price, description
      FROM partner_packages
      WHERE user_id = ?
      ORDER BY id DESC
    `,
    [userId]
  );

  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    duration: item.duration,
    price: Number(item.price),
    description: item.description,
  }));
}

export async function createPartnerPackage(
  userId: number,
  input: Omit<PartnerPackage, "id">
) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO partner_packages (user_id, name, duration, price, description)
      VALUES (?, ?, ?, ?, ?)
    `,
    [userId, input.name, input.duration, input.price, input.description]
  );

  return {
    id: Number(result.insertId),
    ...input,
  };
}

export async function updatePartnerPackage(
  userId: number,
  packageId: number,
  input: Omit<PartnerPackage, "id">
) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  await pool.execute(
    `
      UPDATE partner_packages
      SET name = ?, duration = ?, price = ?, description = ?
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [input.name, input.duration, input.price, input.description, packageId, userId]
  );
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
      ORDER BY p.brand_name ASC
    `
  );
  const [galleryRows] = await pool.execute<PartnerGalleryRow[]>(
    `
      SELECT id, user_id, title, category, image_url
      FROM partner_gallery_items
      ORDER BY user_id ASC, id ASC
    `
  );

  const firstGalleryImageByUser = new Map<number, string>();

  for (const item of galleryRows) {
    if (!firstGalleryImageByUser.has(item.user_id)) {
      firstGalleryImageByUser.set(item.user_id, item.image_url);
    }
  }

  return profileRows.map((profile, index) => {
    const specializations = parseSpecializations(profile.specializations_json);

    return {
      userId: profile.user_id,
      slug: profile.slug,
      brandName: profile.brand_name,
      category: specializations[0] || "General",
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
    packages,
  };
}

export async function listPublicPartnerKnowledge() {
  await ensurePartnerProfilesForAdmins();

  const pool = getDbPool();
  const [profileRows] = await pool.execute<PartnerProfileRow[]>(`
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
    `);
  const [packageRows] = await pool.execute<PartnerPackageRow[]>(`
      SELECT id, user_id, name, duration, price, description
      FROM partner_packages
      ORDER BY user_id ASC, id ASC
    `);

  const packagesByUserId = new Map<number, PartnerPackage[]>();

  for (const row of packageRows) {
    const currentPackages = packagesByUserId.get(row.user_id) ?? [];

    currentPackages.push({
      id: row.id,
      name: row.name,
      duration: row.duration,
      price: Number(row.price),
      description: row.description,
    });
    packagesByUserId.set(row.user_id, currentPackages);
  }

  return profileRows.map((profile) => {
    const specializations = parseSpecializations(profile.specializations_json);

    return {
      userId: profile.user_id,
      slug: profile.slug,
      brandName: profile.brand_name,
      category: specializations[0] || "General",
      description: profile.description,
      specializations,
      address: profile.address,
      whatsapp: profile.whatsapp,
      packages: packagesByUserId.get(profile.user_id) ?? [],
    };
  });
}
