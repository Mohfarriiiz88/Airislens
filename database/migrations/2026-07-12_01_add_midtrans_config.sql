-- Migration: add midtrans_config
-- Purpose: store Midtrans server/client keys in DB (managed via superadmin settings)
--          instead of environment variables. Server key is encrypted with
--          AES-256-GCM using SETTINGS_ENCRYPTION_KEY (see lib/crypto.ts).
-- Date: 2026-07-12

CREATE TABLE IF NOT EXISTS `midtrans_config` (
  `id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `server_key_ciphertext` TEXT NULL,
  `server_key_iv` VARCHAR(32) NULL,
  `server_key_tag` VARCHAR(32) NULL,
  `client_key` VARCHAR(255) NULL,
  `is_production` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by_user_id` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `midtrans_config_single_row` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed empty row so subsequent updates hit an existing record.
INSERT INTO `midtrans_config` (`id`, `is_production`)
VALUES (1, 0)
ON DUPLICATE KEY UPDATE `id` = `id`;
