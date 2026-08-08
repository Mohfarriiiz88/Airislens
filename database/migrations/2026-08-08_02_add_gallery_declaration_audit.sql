-- AirisLens migration: add declaration audit fields for partner gallery uploads
-- Tujuan:
-- 1. Simpan bukti deklarasi fotografer pada setiap foto galeri.
-- 2. Menyimpan waktu deklarasi tanpa menambah relasi user ganda.

DELIMITER $$

DROP PROCEDURE IF EXISTS airislens_add_gallery_declaration_audit $$

CREATE PROCEDURE airislens_add_gallery_declaration_audit()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_gallery_items'
      AND COLUMN_NAME = 'ownership_declared'
  ) THEN
    ALTER TABLE partner_gallery_items
      ADD COLUMN ownership_declared TINYINT(1) NOT NULL DEFAULT 0 AFTER image_url;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_gallery_items'
      AND COLUMN_NAME = 'subject_consent_declared'
  ) THEN
    ALTER TABLE partner_gallery_items
      ADD COLUMN subject_consent_declared TINYINT(1) NOT NULL DEFAULT 0 AFTER ownership_declared;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_gallery_items'
      AND COLUMN_NAME = 'publication_consent_declared'
  ) THEN
    ALTER TABLE partner_gallery_items
      ADD COLUMN publication_consent_declared TINYINT(1) NOT NULL DEFAULT 0 AFTER subject_consent_declared;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_gallery_items'
      AND COLUMN_NAME = 'responsibility_accepted'
  ) THEN
    ALTER TABLE partner_gallery_items
      ADD COLUMN responsibility_accepted TINYINT(1) NOT NULL DEFAULT 0 AFTER publication_consent_declared;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_gallery_items'
      AND COLUMN_NAME = 'declaration_accepted_at'
  ) THEN
    ALTER TABLE partner_gallery_items
      ADD COLUMN declaration_accepted_at DATETIME NULL AFTER responsibility_accepted;
  END IF;
END $$

CALL airislens_add_gallery_declaration_audit() $$

DROP PROCEDURE airislens_add_gallery_declaration_audit $$

DELIMITER ;
