SET @has_booking_end_time := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND COLUMN_NAME = 'booking_end_time'
);

SET @booking_end_time_sql := IF(
  @has_booking_end_time = 0,
  'ALTER TABLE bookings ADD COLUMN booking_end_time TIME NULL AFTER booking_time',
  'SELECT 1'
);

PREPARE booking_end_time_stmt FROM @booking_end_time_sql;
EXECUTE booking_end_time_stmt;
DEALLOCATE PREPARE booking_end_time_stmt;

-- Backfill detail durasi booking lama ditangani oleh ensureBookingSchema() di aplikasi
-- dengan membaca duration dari partner_packages jika tersedia.
