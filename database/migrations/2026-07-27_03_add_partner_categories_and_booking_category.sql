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
);

SET @has_partner_package_category_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'partner_packages'
    AND COLUMN_NAME = 'category_id'
);

SET @partner_package_category_id_sql := IF(
  @has_partner_package_category_id = 0,
  'ALTER TABLE partner_packages ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER user_id',
  'SELECT 1'
);

PREPARE partner_package_category_id_stmt FROM @partner_package_category_id_sql;
EXECUTE partner_package_category_id_stmt;
DEALLOCATE PREPARE partner_package_category_id_stmt;

SET @has_partner_package_category_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'partner_packages'
    AND INDEX_NAME = 'partner_packages_category_id_idx'
);

SET @partner_package_category_idx_sql := IF(
  @has_partner_package_category_idx = 0,
  'ALTER TABLE partner_packages ADD KEY partner_packages_category_id_idx (category_id)',
  'SELECT 1'
);

PREPARE partner_package_category_idx_stmt FROM @partner_package_category_idx_sql;
EXECUTE partner_package_category_idx_stmt;
DEALLOCATE PREPARE partner_package_category_idx_stmt;

SET @has_booking_category_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND COLUMN_NAME = 'category_id'
);

SET @booking_category_id_sql := IF(
  @has_booking_category_id = 0,
  'ALTER TABLE bookings ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER customer_user_id',
  'SELECT 1'
);

PREPARE booking_category_id_stmt FROM @booking_category_id_sql;
EXECUTE booking_category_id_stmt;
DEALLOCATE PREPARE booking_category_id_stmt;

SET @has_booking_category_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND INDEX_NAME = 'bookings_category_id_idx'
);

SET @booking_category_idx_sql := IF(
  @has_booking_category_idx = 0,
  'ALTER TABLE bookings ADD KEY bookings_category_id_idx (category_id)',
  'SELECT 1'
);

PREPARE booking_category_idx_stmt FROM @booking_category_idx_sql;
EXECUTE booking_category_idx_stmt;
DEALLOCATE PREPARE booking_category_idx_stmt;

INSERT INTO partner_categories (user_id, name, slug)
SELECT package_users.user_id, 'General', 'general'
FROM (
  SELECT DISTINCT user_id
  FROM partner_packages
) package_users
LEFT JOIN partner_categories existing
  ON existing.user_id = package_users.user_id
 AND existing.slug = 'general'
WHERE existing.id IS NULL;

UPDATE partner_packages pkg
INNER JOIN partner_categories cat
  ON cat.user_id = pkg.user_id
 AND cat.slug = 'general'
SET pkg.category_id = cat.id
WHERE pkg.category_id IS NULL;

UPDATE bookings b
INNER JOIN partner_packages pkg
  ON pkg.id = b.package_id
SET b.category_id = pkg.category_id
WHERE b.category_id IS NULL
  AND b.package_id IS NOT NULL
  AND pkg.category_id IS NOT NULL;
