CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  password_hash TEXT NOT NULL,
  role ENUM('superadmin', 'admin', 'user') NOT NULL DEFAULT 'user',
  email_verified_at DATETIME NULL DEFAULT NULL,
  verification_token VARCHAR(255) DEFAULT NULL,
  verification_expires_at DATETIME DEFAULT NULL,
  superadmin_slot TINYINT GENERATED ALWAYS AS (
    CASE WHEN role = 'superadmin' THEN 1 ELSE NULL END
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  UNIQUE KEY users_verification_token_unique (verification_token),
  UNIQUE KEY users_superadmin_singleton (superadmin_slot)
);
