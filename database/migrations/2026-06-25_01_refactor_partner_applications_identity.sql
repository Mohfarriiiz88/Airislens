-- AirisLens migration: partner_applications stores only partner-specific submission data
-- Tujuan:
-- 1. Pastikan phone menjadi atribut resmi di users.
-- 2. Pindahkan identitas dasar partner application agar dibaca dari users.
-- 3. Hapus kolom duplikat name/email/phone dari partner_applications.

DELIMITER $$

DROP PROCEDURE IF EXISTS airislens_refactor_partner_applications_identity $$

CREATE PROCEDURE airislens_refactor_partner_applications_identity()
BEGIN
  DECLARE unresolved_applications BIGINT DEFAULT 0;
  DECLARE fk_exists BIGINT DEFAULT 0;
  DECLARE app_email_exists BIGINT DEFAULT 0;
  DECLARE app_phone_exists BIGINT DEFAULT 0;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'phone'
  ) THEN
    ALTER TABLE users
      ADD COLUMN phone VARCHAR(20) NULL AFTER email;
  END IF;

  SELECT COUNT(*) INTO app_email_exists
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'partner_applications'
    AND COLUMN_NAME = 'email';

  SELECT COUNT(*) INTO app_phone_exists
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'partner_applications'
    AND COLUMN_NAME = 'phone';

  IF app_email_exists > 0 THEN
    UPDATE partner_applications a
    INNER JOIN users u ON u.email = a.email
    SET a.submitted_by_user_id = u.id
    WHERE a.submitted_by_user_id IS NULL;
  END IF;

  IF app_phone_exists > 0 THEN
    UPDATE users u
    INNER JOIN (
      SELECT a.submitted_by_user_id, a.phone
      FROM partner_applications a
      INNER JOIN (
        SELECT submitted_by_user_id, MAX(id) AS latest_id
        FROM partner_applications
        WHERE submitted_by_user_id IS NOT NULL
          AND phone IS NOT NULL
          AND TRIM(phone) <> ''
        GROUP BY submitted_by_user_id
      ) latest ON latest.latest_id = a.id
    ) latest_phone ON latest_phone.submitted_by_user_id = u.id
    SET u.phone = latest_phone.phone
    WHERE u.phone IS NULL
       OR TRIM(u.phone) = '';
  END IF;

  SELECT COUNT(*) INTO unresolved_applications
  FROM partner_applications
  WHERE submitted_by_user_id IS NULL;

  IF unresolved_applications > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: some partner_applications still have NULL submitted_by_user_id. Fill them manually before rerunning this migration.';
  END IF;

  SELECT COUNT(*) INTO fk_exists
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_partner_applications_submitted_user';

  IF fk_exists > 0 THEN
    ALTER TABLE partner_applications
      DROP FOREIGN KEY fk_partner_applications_submitted_user;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND INDEX_NAME = 'partner_applications_email_idx'
  ) THEN
    ALTER TABLE partner_applications
      DROP INDEX partner_applications_email_idx;
  END IF;

  ALTER TABLE partner_applications
    MODIFY COLUMN submitted_by_user_id BIGINT UNSIGNED NOT NULL;

  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'name'
  ) THEN
    ALTER TABLE partner_applications
      DROP COLUMN name;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'email'
  ) THEN
    ALTER TABLE partner_applications
      DROP COLUMN email;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND COLUMN_NAME = 'phone'
  ) THEN
    ALTER TABLE partner_applications
      DROP COLUMN phone;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND INDEX_NAME = 'partner_applications_status_idx'
  ) THEN
    ALTER TABLE partner_applications
      ADD INDEX partner_applications_status_idx (status);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_applications'
      AND INDEX_NAME = 'partner_applications_user_id_idx'
  ) THEN
    ALTER TABLE partner_applications
      ADD INDEX partner_applications_user_id_idx (submitted_by_user_id);
  END IF;

  ALTER TABLE partner_applications
    ADD CONSTRAINT fk_partner_applications_submitted_user
    FOREIGN KEY (submitted_by_user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
END $$

CALL airislens_refactor_partner_applications_identity() $$

DROP PROCEDURE airislens_refactor_partner_applications_identity $$

DELIMITER ;
