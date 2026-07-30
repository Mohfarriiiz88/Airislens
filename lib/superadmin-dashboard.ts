import "server-only";

import { type RowDataPacket } from "mysql2/promise";

import { ensureBookingSchema } from "@/lib/bookings";
import { getDbPool } from "@/lib/db";

type SuperadminDashboardRow = RowDataPacket & {
  total_users: number | null;
  total_partners: number | null;
  total_bookings: number | null;
  total_revenue: number | null;
};

export type SuperadminDashboardSnapshot = {
  totalUsers: number;
  totalPartners: number;
  totalBookings: number;
  totalRevenue: number;
};

export async function getSuperadminDashboardSnapshot() {
  await ensureBookingSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<SuperadminDashboardRow[]>(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'user') AS total_users,
      (SELECT COUNT(*) FROM users WHERE role = 'admin') AS total_partners,
      (SELECT COUNT(*) FROM bookings) AS total_bookings,
      (
        SELECT COALESCE(
          SUM(
            CASE
              WHEN status NOT IN ('cancelled', 'refunded')
                THEN COALESCE(total_price, amount)
              ELSE 0
            END
          ),
          0
        )
        FROM bookings
      ) AS total_revenue
  `);

  const summary = rows[0];

  return {
    totalUsers: Number(summary?.total_users ?? 0),
    totalPartners: Number(summary?.total_partners ?? 0),
    totalBookings: Number(summary?.total_bookings ?? 0),
    totalRevenue: Number(summary?.total_revenue ?? 0),
  } satisfies SuperadminDashboardSnapshot;
}
