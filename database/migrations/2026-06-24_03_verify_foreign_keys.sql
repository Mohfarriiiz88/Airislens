-- Verifikasi foreign key AirisLens

SELECT
  rc.CONSTRAINT_NAME,
  rc.TABLE_NAME,
  kcu.COLUMN_NAME,
  rc.REFERENCED_TABLE_NAME,
  kcu.REFERENCED_COLUMN_NAME,
  rc.UPDATE_RULE,
  rc.DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS rc
INNER JOIN information_schema.KEY_COLUMN_USAGE kcu
  ON kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
 AND kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
 AND kcu.TABLE_NAME = rc.TABLE_NAME
WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
  AND rc.TABLE_NAME IN (
    'partner_profiles',
    'partner_packages',
    'partner_gallery_items',
    'partner_schedules',
    'partner_applications',
    'bookings'
  )
ORDER BY rc.TABLE_NAME, rc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION;

SHOW CREATE TABLE partner_profiles;
SHOW CREATE TABLE partner_packages;
SHOW CREATE TABLE partner_gallery_items;
SHOW CREATE TABLE partner_schedules;
SHOW CREATE TABLE partner_applications;
SHOW CREATE TABLE bookings;
