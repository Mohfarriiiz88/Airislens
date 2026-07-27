SET @db_name = DATABASE();

SET @has_email_verified_at = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'email_verified_at'
);

SET @sql = IF(
  @has_email_verified_at = 0,
  'ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL DEFAULT NULL AFTER role',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_verification_token = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'verification_token'
);

SET @sql = IF(
  @has_verification_token = 0,
  'ALTER TABLE users ADD COLUMN verification_token VARCHAR(255) DEFAULT NULL AFTER email_verified_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_verification_expires_at = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'verification_expires_at'
);

SET @sql = IF(
  @has_verification_expires_at = 0,
  'ALTER TABLE users ADD COLUMN verification_expires_at DATETIME DEFAULT NULL AFTER verification_token',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_verification_token_unique = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'users_verification_token_unique'
);

SET @sql = IF(
  @has_verification_token_unique = 0,
  'ALTER TABLE users ADD UNIQUE KEY users_verification_token_unique (verification_token)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE users
SET
  email_verified_at = COALESCE(email_verified_at, NOW()),
  verification_token = NULL,
  verification_expires_at = NULL
WHERE email_verified_at IS NULL;
