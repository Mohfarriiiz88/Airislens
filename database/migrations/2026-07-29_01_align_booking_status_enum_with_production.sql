SET @has_bookings := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
);

SET @expand_booking_status_enum_sql := IF(
  @has_bookings = 0,
  'SELECT 1',
  "ALTER TABLE bookings
   MODIFY COLUMN status ENUM(
     'pending',
     'pending_payment',
     'confirmed',
     'in_progress',
     'awaiting_confirmation',
     'completed',
     'cancelled',
     'disputed',
     'refunded'
   ) NOT NULL DEFAULT 'pending_payment'"
);

PREPARE expand_booking_status_enum_stmt FROM @expand_booking_status_enum_sql;
EXECUTE expand_booking_status_enum_stmt;
DEALLOCATE PREPARE expand_booking_status_enum_stmt;

UPDATE bookings
SET status = CASE
  WHEN status = 'pending' THEN 'pending_payment'
  WHEN status = 'completed' AND customer_confirmed_at IS NULL THEN 'awaiting_confirmation'
  ELSE status
END
WHERE status = 'pending'
   OR (status = 'completed' AND customer_confirmed_at IS NULL);

SET @finalize_booking_status_enum_sql := IF(
  @has_bookings = 0,
  'SELECT 1',
  "ALTER TABLE bookings
   MODIFY COLUMN status ENUM(
     'pending_payment',
     'confirmed',
     'in_progress',
     'awaiting_confirmation',
     'completed',
     'cancelled',
     'disputed',
     'refunded'
   ) NOT NULL DEFAULT 'pending_payment'"
);

PREPARE finalize_booking_status_enum_stmt FROM @finalize_booking_status_enum_sql;
EXECUTE finalize_booking_status_enum_stmt;
DEALLOCATE PREPARE finalize_booking_status_enum_stmt;
