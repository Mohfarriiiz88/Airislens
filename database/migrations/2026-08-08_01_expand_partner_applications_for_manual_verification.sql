-- AirisLens migration: expand partner_applications for manual verification flow
-- Tujuan:
-- 1. Simpan snapshot identitas pendaftar saat submit.
-- 2. Tambahkan data verifikasi untuk fotografer perorangan dan studio.
-- 3. Tambahkan metadata deklarasi, reviewer, dan alasan penolakan.

DELIMITER $$

DROP PROCEDURE IF EXISTS airislens_expand_partner_applications_manual_review $$

CREATE PROCEDURE airislens_expand_partner_applications_manual_review()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'applicant_name'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN applicant_name VARCHAR(100) NOT NULL DEFAULT '' AFTER id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'applicant_email'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN applicant_email VARCHAR(191) NOT NULL DEFAULT '' AFTER applicant_name;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'applicant_phone'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN applicant_phone VARCHAR(30) NOT NULL DEFAULT '' AFTER applicant_email;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'partner_type'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN partner_type ENUM('individual', 'studio') NOT NULL DEFAULT 'individual' AFTER applicant_phone;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'domicile_city'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN domicile_city VARCHAR(100) NOT NULL DEFAULT '' AFTER location;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'address'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN address TEXT NULL AFTER domicile_city;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'brand_name'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN brand_name VARCHAR(100) NOT NULL DEFAULT '' AFTER address;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'specializations_json'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN specializations_json TEXT NULL AFTER category;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'instagram_url'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN instagram_url VARCHAR(255) NOT NULL DEFAULT '' AFTER experience;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'maps_url'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN maps_url VARCHAR(255) NULL AFTER about_you;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'website_url'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN website_url VARCHAR(255) NULL AFTER maps_url;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'established_year'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN established_year SMALLINT UNSIGNED NULL AFTER website_url;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'studio_phone'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN studio_phone VARCHAR(30) NULL AFTER established_year;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'declaration_items_json'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN declaration_items_json TEXT NULL AFTER studio_phone;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'declaration_accepted'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN declaration_accepted TINYINT(1) NOT NULL DEFAULT 0 AFTER declaration_items_json;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'declaration_accepted_at'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN declaration_accepted_at DATETIME NULL AFTER declaration_accepted;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'rejection_reason'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN rejection_reason TEXT NULL AFTER status;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'reviewed_at'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN reviewed_at DATETIME NULL AFTER rejection_reason;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'reviewed_by_user_id'
  ) THEN
    ALTER TABLE partner_applications
      ADD COLUMN reviewed_by_user_id BIGINT UNSIGNED NULL AFTER reviewed_at;
  END IF;

  UPDATE partner_applications a
  INNER JOIN users u ON u.id = a.submitted_by_user_id
  SET
    a.applicant_name = CASE
      WHEN TRIM(a.applicant_name) = '' THEN u.name
      ELSE a.applicant_name
    END,
    a.applicant_email = CASE
      WHEN TRIM(a.applicant_email) = '' THEN u.email
      ELSE a.applicant_email
    END,
    a.applicant_phone = CASE
      WHEN TRIM(a.applicant_phone) = '' THEN COALESCE(u.phone, '')
      ELSE a.applicant_phone
    END,
    a.domicile_city = CASE
      WHEN TRIM(a.domicile_city) = '' THEN a.location
      ELSE a.domicile_city
    END,
    a.specializations_json = CASE
      WHEN a.specializations_json IS NULL OR TRIM(a.specializations_json) = ''
        THEN CASE
          WHEN TRIM(a.category) = '' THEN JSON_ARRAY()
          ELSE JSON_ARRAY(a.category)
        END
      ELSE a.specializations_json
    END;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND INDEX_NAME = 'partner_applications_partner_type_idx'
  ) THEN
    ALTER TABLE partner_applications
      ADD INDEX partner_applications_partner_type_idx (partner_type);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND INDEX_NAME = 'partner_applications_reviewed_by_user_id_idx'
  ) THEN
    ALTER TABLE partner_applications
      ADD INDEX partner_applications_reviewed_by_user_id_idx (reviewed_by_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_partner_applications_reviewed_by_user'
  ) THEN
    ALTER TABLE partner_applications
      ADD CONSTRAINT fk_partner_applications_reviewed_by_user
      FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$

CALL airislens_expand_partner_applications_manual_review() $$

DROP PROCEDURE airislens_expand_partner_applications_manual_review $$

DELIMITER ;
