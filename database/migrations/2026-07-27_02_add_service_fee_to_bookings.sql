SET @has_service_fee_rate := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND COLUMN_NAME = 'service_fee_rate'
);

SET @service_fee_rate_sql := IF(
  @has_service_fee_rate = 0,
  'ALTER TABLE bookings ADD COLUMN service_fee_rate DECIMAL(5,2) NOT NULL DEFAULT 3.00 AFTER package_price',
  'SELECT 1'
);

PREPARE service_fee_rate_stmt FROM @service_fee_rate_sql;
EXECUTE service_fee_rate_stmt;
DEALLOCATE PREPARE service_fee_rate_stmt;

SET @has_service_fee := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND COLUMN_NAME = 'service_fee'
);

SET @service_fee_sql := IF(
  @has_service_fee = 0,
  'ALTER TABLE bookings ADD COLUMN service_fee INT UNSIGNED NOT NULL DEFAULT 0 AFTER service_fee_rate',
  'SELECT 1'
);

PREPARE service_fee_stmt FROM @service_fee_sql;
EXECUTE service_fee_stmt;
DEALLOCATE PREPARE service_fee_stmt;
