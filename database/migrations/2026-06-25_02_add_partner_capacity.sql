-- AirisLens migration: add partner type and team quota to partner_profiles
-- Tujuan:
-- 1. Bedakan partner perorangan dan studio.
-- 2. Simpan kapasitas booking aktif per slot pada profil partner.

ALTER TABLE partner_profiles
  ADD COLUMN IF NOT EXISTS partner_type ENUM('individual', 'studio')
    NOT NULL DEFAULT 'individual'
    AFTER transport_fee_per_km,
  ADD COLUMN IF NOT EXISTS team_quota INT UNSIGNED
    NOT NULL DEFAULT 1
    AFTER partner_type;

UPDATE partner_profiles
SET
  partner_type = COALESCE(partner_type, 'individual'),
  team_quota = CASE
    WHEN team_quota IS NULL OR team_quota < 1 THEN 1
    ELSE team_quota
  END;
