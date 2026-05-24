import "server-only";

import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import { getFirebaseAdminMessaging } from "@/lib/firebase-admin";

type NotificationTokenRow = RowDataPacket & {
  fcm_token: string;
};

declare global {
  var __airislensNotificationSchemaReady: Promise<void> | undefined;
}

async function ensureNotificationSchemaInternal() {
  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS admin_notification_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      fcm_token VARCHAR(512) NOT NULL,
      user_agent VARCHAR(255) NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY admin_notification_tokens_user_token_unique (user_id, fcm_token),
      KEY admin_notification_tokens_user_id_idx (user_id)
    )
  `);
}

export async function ensureNotificationSchema() {
  if (!global.__airislensNotificationSchemaReady) {
    global.__airislensNotificationSchemaReady = ensureNotificationSchemaInternal().catch(
      (error) => {
        global.__airislensNotificationSchemaReady = undefined;
        throw error;
      }
    );
  }

  return global.__airislensNotificationSchemaReady;
}

export async function saveAdminNotificationToken(
  userId: number,
  token: string,
  userAgent: string
) {
  await ensureNotificationSchema();

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return;
  }

  const pool = getDbPool();

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO admin_notification_tokens (user_id, fcm_token, user_agent)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        user_agent = VALUES(user_agent),
        updated_at = CURRENT_TIMESTAMP
    `,
    [userId, normalizedToken, userAgent.trim().slice(0, 255)]
  );
}

export async function deleteAdminNotificationToken(userId: number, token: string) {
  await ensureNotificationSchema();

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return;
  }

  const pool = getDbPool();

  await pool.execute(
    `
      DELETE FROM admin_notification_tokens
      WHERE user_id = ?
        AND fcm_token = ?
      LIMIT 1
    `,
    [userId, normalizedToken]
  );
}

async function listAdminNotificationTokens(userId: number) {
  await ensureNotificationSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<NotificationTokenRow[]>(
    `
      SELECT fcm_token
      FROM admin_notification_tokens
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `,
    [userId]
  );

  return rows.map((row) => row.fcm_token).filter(Boolean);
}

export type BookingNotificationInput = {
  customerName: string;
  packageName: string;
  date: string;
  time: string;
  location: string;
  photographerUserId: number;
};

export async function sendBookingNotificationToAdmin(
  input: BookingNotificationInput
) {
  const messaging = getFirebaseAdminMessaging();

  if (!messaging) {
    return {
      sent: false,
      reason: "missing-firebase-config",
    } as const;
  }

  const tokens = await listAdminNotificationTokens(input.photographerUserId);

  if (tokens.length === 0) {
    return {
      sent: false,
      reason: "no-device-token",
    } as const;
  }

  const title = "Booking baru masuk";
  const body = `${input.customerName} memesan ${input.packageName} untuk ${input.date} ${input.time}`;
  const location = input.location.trim() || "-";

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    webpush: {
      fcmOptions: {
        link: "/admin/bookinglist",
      },
      notification: {
        title,
        body,
        icon: "/svg/logogram.svg",
        badge: "/svg/logogram.svg",
        tag: `booking-${input.photographerUserId}-${input.date}-${input.time}`,
      },
      data: {
        customerName: input.customerName,
        packageName: input.packageName,
        date: input.date,
        time: input.time,
        location,
      },
    },
    data: {
      customerName: input.customerName,
      packageName: input.packageName,
      date: input.date,
      time: input.time,
      location,
      clickUrl: "/admin/bookinglist",
    },
  });

  const invalidTokens: string[] = [];

  response.responses.forEach((result, index) => {
    if (
      result.success ||
      !result.error ||
      !(
        result.error.code === "messaging/invalid-registration-token" ||
        result.error.code === "messaging/registration-token-not-registered"
      )
    ) {
      return;
    }

    invalidTokens.push(tokens[index]);
  });

  if (invalidTokens.length > 0) {
    const pool = getDbPool();
    const placeholders = invalidTokens.map(() => "?").join(", ");

    await pool.execute(
      `
        DELETE FROM admin_notification_tokens
        WHERE user_id = ?
          AND fcm_token IN (${placeholders})
      `,
      [input.photographerUserId, ...invalidTokens]
    );
  }

  return {
    sent: response.successCount > 0,
    successCount: response.successCount,
    failureCount: response.failureCount,
  } as const;
}
