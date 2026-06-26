-- AirisLens foreign key precheck
-- Jalankan file ini lebih dulu untuk memastikan data lama aman
-- sebelum menambahkan foreign key.

SELECT 'partner_profiles.user_id -> users.id' AS relation_name,
       COUNT(*) AS orphan_rows
FROM partner_profiles p
LEFT JOIN users u ON u.id = p.user_id
WHERE u.id IS NULL;

SELECT 'partner_packages.user_id -> users.id' AS relation_name,
       COUNT(*) AS orphan_rows
FROM partner_packages p
LEFT JOIN users u ON u.id = p.user_id
WHERE u.id IS NULL;

SELECT 'partner_gallery_items.user_id -> users.id' AS relation_name,
       COUNT(*) AS orphan_rows
FROM partner_gallery_items g
LEFT JOIN users u ON u.id = g.user_id
WHERE u.id IS NULL;

SELECT 'partner_schedules.user_id -> users.id' AS relation_name,
       COUNT(*) AS orphan_rows
FROM partner_schedules s
LEFT JOIN users u ON u.id = s.user_id
WHERE u.id IS NULL;

SELECT 'partner_applications.submitted_by_user_id -> users.id' AS relation_name,
       COUNT(*) AS orphan_rows
FROM partner_applications a
LEFT JOIN users u ON u.id = a.submitted_by_user_id
WHERE a.submitted_by_user_id IS NOT NULL
  AND u.id IS NULL;

SELECT 'bookings.photographer_user_id -> users.id' AS relation_name,
       COUNT(*) AS orphan_rows
FROM bookings b
LEFT JOIN users u ON u.id = b.photographer_user_id
WHERE u.id IS NULL;

SELECT 'bookings.customer_user_id -> users.id' AS relation_name,
       COUNT(*) AS orphan_rows
FROM bookings b
LEFT JOIN users u ON u.id = b.customer_user_id
WHERE b.customer_user_id IS NOT NULL
  AND u.id IS NULL;

SELECT 'bookings.package_id -> partner_packages.id' AS relation_name,
       COUNT(*) AS orphan_rows
FROM bookings b
LEFT JOIN partner_packages p ON p.id = b.package_id
WHERE b.package_id IS NOT NULL
  AND p.id IS NULL;

-- Detail orphan rows yang saat ini perlu diperbaiki.
SELECT
  a.id,
  a.name,
  a.email,
  a.submitted_by_user_id
FROM partner_applications a
LEFT JOIN users u ON u.id = a.submitted_by_user_id
WHERE a.submitted_by_user_id IS NOT NULL
  AND u.id IS NULL
ORDER BY a.id ASC;

-- Query perbaikan yang disarankan untuk orphan di partner_applications.
-- Pilihan aman, sesuai relasi ON DELETE SET NULL:
-- UPDATE partner_applications a
-- LEFT JOIN users u ON u.id = a.submitted_by_user_id
-- SET a.submitted_by_user_id = NULL
-- WHERE a.submitted_by_user_id IS NOT NULL
--   AND u.id IS NULL;

-- Pilihan jika Anda ingin memetakan orphan ke user tertentu yang valid:
-- UPDATE partner_applications
-- SET submitted_by_user_id = <user_id_yang_valid>
-- WHERE id IN (1, 2, 3);
