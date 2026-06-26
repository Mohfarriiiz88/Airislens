-- AirisLens migration: add physical foreign keys
-- IMPORTANT:
-- 1. Jalankan 2026-06-24_01_fk_precheck.sql terlebih dahulu.
-- 2. Pastikan semua orphan row sudah diperbaiki.
-- 3. File ini akan menghentikan proses jika masih ada orphan row.

DELIMITER $$

DROP PROCEDURE IF EXISTS airislens_add_foreign_keys $$

CREATE PROCEDURE airislens_add_foreign_keys()
BEGIN
  DECLARE orphan_partner_profiles BIGINT DEFAULT 0;
  DECLARE orphan_partner_packages BIGINT DEFAULT 0;
  DECLARE orphan_partner_gallery BIGINT DEFAULT 0;
  DECLARE orphan_partner_schedules BIGINT DEFAULT 0;
  DECLARE orphan_partner_applications BIGINT DEFAULT 0;
  DECLARE orphan_bookings_photographer BIGINT DEFAULT 0;
  DECLARE orphan_bookings_customer BIGINT DEFAULT 0;
  DECLARE orphan_bookings_package BIGINT DEFAULT 0;

  SELECT COUNT(*) INTO orphan_partner_profiles
  FROM partner_profiles p
  LEFT JOIN users u ON u.id = p.user_id
  WHERE u.id IS NULL;

  SELECT COUNT(*) INTO orphan_partner_packages
  FROM partner_packages p
  LEFT JOIN users u ON u.id = p.user_id
  WHERE u.id IS NULL;

  SELECT COUNT(*) INTO orphan_partner_gallery
  FROM partner_gallery_items g
  LEFT JOIN users u ON u.id = g.user_id
  WHERE u.id IS NULL;

  SELECT COUNT(*) INTO orphan_partner_schedules
  FROM partner_schedules s
  LEFT JOIN users u ON u.id = s.user_id
  WHERE u.id IS NULL;

  SELECT COUNT(*) INTO orphan_partner_applications
  FROM partner_applications a
  LEFT JOIN users u ON u.id = a.submitted_by_user_id
  WHERE a.submitted_by_user_id IS NOT NULL
    AND u.id IS NULL;

  SELECT COUNT(*) INTO orphan_bookings_photographer
  FROM bookings b
  LEFT JOIN users u ON u.id = b.photographer_user_id
  WHERE u.id IS NULL;

  SELECT COUNT(*) INTO orphan_bookings_customer
  FROM bookings b
  LEFT JOIN users u ON u.id = b.customer_user_id
  WHERE b.customer_user_id IS NOT NULL
    AND u.id IS NULL;

  SELECT COUNT(*) INTO orphan_bookings_package
  FROM bookings b
  LEFT JOIN partner_packages p ON p.id = b.package_id
  WHERE b.package_id IS NOT NULL
    AND p.id IS NULL;

  IF orphan_partner_profiles > 0
     OR orphan_partner_packages > 0
     OR orphan_partner_gallery > 0
     OR orphan_partner_schedules > 0
     OR orphan_partner_applications > 0
     OR orphan_bookings_photographer > 0
     OR orphan_bookings_customer > 0
     OR orphan_bookings_package > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Foreign key migration aborted: orphan rows still exist. Run the precheck file and repair the reported rows first.';
  END IF;

  ALTER TABLE users ENGINE = InnoDB;
  ALTER TABLE partner_profiles ENGINE = InnoDB;
  ALTER TABLE partner_packages ENGINE = InnoDB;
  ALTER TABLE partner_gallery_items ENGINE = InnoDB;
  ALTER TABLE partner_schedules ENGINE = InnoDB;
  ALTER TABLE partner_applications ENGINE = InnoDB;
  ALTER TABLE bookings ENGINE = InnoDB;

  ALTER TABLE users
    MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;

  ALTER TABLE partner_profiles
    MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL;

  ALTER TABLE partner_packages
    MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL;

  ALTER TABLE partner_gallery_items
    MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL;

  ALTER TABLE partner_schedules
    MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL;

  ALTER TABLE partner_applications
    MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    MODIFY COLUMN submitted_by_user_id BIGINT UNSIGNED NULL;

  ALTER TABLE bookings
    MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    MODIFY COLUMN photographer_user_id BIGINT UNSIGNED NOT NULL,
    MODIFY COLUMN customer_user_id BIGINT UNSIGNED NULL,
    MODIFY COLUMN package_id BIGINT UNSIGNED NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_packages'
      AND INDEX_NAME = 'partner_packages_user_id_idx'
  ) THEN
    ALTER TABLE partner_packages
      ADD INDEX partner_packages_user_id_idx (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_gallery_items'
      AND INDEX_NAME = 'partner_gallery_items_user_id_idx'
  ) THEN
    ALTER TABLE partner_gallery_items
      ADD INDEX partner_gallery_items_user_id_idx (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'partner_schedules'
      AND INDEX_NAME = 'partner_schedules_user_id_idx'
  ) THEN
    ALTER TABLE partner_schedules
      ADD INDEX partner_schedules_user_id_idx (user_id);
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

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'bookings_photographer_user_id_idx'
  ) THEN
    ALTER TABLE bookings
      ADD INDEX bookings_photographer_user_id_idx (photographer_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'bookings_customer_user_id_idx'
  ) THEN
    ALTER TABLE bookings
      ADD INDEX bookings_customer_user_id_idx (customer_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'bookings_package_id_idx'
  ) THEN
    ALTER TABLE bookings
      ADD INDEX bookings_package_id_idx (package_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_partner_profiles_user'
  ) THEN
    ALTER TABLE partner_profiles
      ADD CONSTRAINT fk_partner_profiles_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_partner_packages_user'
  ) THEN
    ALTER TABLE partner_packages
      ADD CONSTRAINT fk_partner_packages_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_partner_gallery_items_user'
  ) THEN
    ALTER TABLE partner_gallery_items
      ADD CONSTRAINT fk_partner_gallery_items_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_partner_schedules_user'
  ) THEN
    ALTER TABLE partner_schedules
      ADD CONSTRAINT fk_partner_schedules_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_partner_applications_submitted_user'
  ) THEN
    ALTER TABLE partner_applications
      ADD CONSTRAINT fk_partner_applications_submitted_user
      FOREIGN KEY (submitted_by_user_id) REFERENCES users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_bookings_photographer_user'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT fk_bookings_photographer_user
      FOREIGN KEY (photographer_user_id) REFERENCES users(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_bookings_customer_user'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT fk_bookings_customer_user
      FOREIGN KEY (customer_user_id) REFERENCES users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_bookings_package'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT fk_bookings_package
      FOREIGN KEY (package_id) REFERENCES partner_packages(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$

CALL airislens_add_foreign_keys() $$

DROP PROCEDURE airislens_add_foreign_keys $$

DELIMITER ;
