-- AirisLens migration: add bank account and CV fields for partner applications
-- Tujuan:
-- 1. Menyimpan data rekening bank pendaftar sebagai bagian dari verifikasi.
-- 2. Menyimpan URL file CV yang diunggah pendaftar.

DELIMITER $$

DROP PROCEDURE IF EXISTS airislens_add_partner_application_bank_and_cv $$

CREATE PROCEDURE airislens_add_partner_application_bank_and_cv()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'bank_name'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN bank_name VARCHAR(100) NOT NULL DEFAULT '' AFTER terms_accepted_at;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'bank_account_number'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN bank_account_number VARCHAR(30) NOT NULL DEFAULT '' AFTER bank_name;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'cv_file_url'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN cv_file_url VARCHAR(255) NOT NULL DEFAULT '' AFTER bank_account_number;
  END IF;
END $$

CALL airislens_add_partner_application_bank_and_cv() $$

DROP PROCEDURE airislens_add_partner_application_bank_and_cv $$

DELIMITER ;
