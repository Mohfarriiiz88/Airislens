-- AirisLens migration: add final partner terms approval audit
-- Tujuan:
-- 1. Simpan bukti persetujuan modal akhir sebelum pengajuan mitra dikirim.
-- 2. Menyimpan versi klausul dan waktu persetujuan per application.

DELIMITER $$

DROP PROCEDURE IF EXISTS airislens_add_partner_application_terms_audit $$

CREATE PROCEDURE airislens_add_partner_application_terms_audit()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'terms_accepted'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN terms_accepted TINYINT(1) NOT NULL DEFAULT 0 AFTER declaration_accepted_at;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'terms_version'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN terms_version VARCHAR(20) NULL AFTER terms_accepted;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'terms_accepted_at'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN terms_accepted_at DATETIME NULL AFTER terms_version;
  END IF;
END $$

CALL airislens_add_partner_application_terms_audit() $$

DROP PROCEDURE airislens_add_partner_application_terms_audit $$

DELIMITER ;
