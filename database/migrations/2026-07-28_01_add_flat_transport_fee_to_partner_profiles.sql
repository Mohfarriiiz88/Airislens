SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'partner_profiles'
        AND COLUMN_NAME = 'flat_transport_fee'
    ),
    'SELECT 1',
    'ALTER TABLE partner_profiles ADD COLUMN flat_transport_fee INT UNSIGNED NOT NULL DEFAULT 0 AFTER free_distance_km'
  )
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
