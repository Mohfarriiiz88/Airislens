import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import mysql from "mysql2/promise";

loadEnvFile(".env");
loadEnvFile(".env.local", true);

function loadEnvFile(fileName, override = false) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const source = readFileSync(filePath, "utf8");

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (override || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function hasColumn(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function hasIndex(connection, tableName, indexName) {
  const [rows] = await connection.execute(
    `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName]
  );

  return rows.length > 0;
}

async function hasForeignKey(connection, constraintName) {
  const [rows] = await connection.execute(
    `
      SELECT 1
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME = ?
      LIMIT 1
    `,
    [constraintName]
  );

  return rows.length > 0;
}

async function getSingleCount(connection, query, params = []) {
  const [rows] = await connection.execute(query, params);
  return Number(rows[0]?.total ?? 0);
}

async function main() {
  const connection = await mysql.createConnection({
    host: getRequiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? "3306"),
    user: getRequiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: getRequiredEnv("DB_NAME"),
  });

  try {
    console.log("Connected. Starting partner_applications identity refactor...");

    if (!(await hasColumn(connection, "users", "phone"))) {
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN phone VARCHAR(20) NULL AFTER email
      `);
      console.log("Added users.phone");
    }

    const hasEmailColumn = await hasColumn(connection, "partner_applications", "email");
    const hasPhoneColumn = await hasColumn(connection, "partner_applications", "phone");
    const hasNameColumn = await hasColumn(connection, "partner_applications", "name");

    if (hasEmailColumn) {
      const [result] = await connection.execute(
        `
          UPDATE partner_applications a
          INNER JOIN users u ON u.email = a.email
          SET a.submitted_by_user_id = u.id
          WHERE a.submitted_by_user_id IS NULL
        `
      );
      console.log(`Linked partner applications to users by email: ${result.affectedRows ?? 0}`);
    }

    if (hasPhoneColumn) {
      const [result] = await connection.execute(
        `
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
             OR TRIM(u.phone) = ''
        `
      );
      console.log(`Copied phone values into users: ${result.affectedRows ?? 0}`);
    }

    const unresolvedApplications = await getSingleCount(
      connection,
      `
        SELECT COUNT(*) AS total
        FROM partner_applications
        WHERE submitted_by_user_id IS NULL
      `
    );

    if (unresolvedApplications > 0) {
      throw new Error(
        `Migration aborted: ${unresolvedApplications} partner_applications still have NULL submitted_by_user_id.`
      );
    }

    if (await hasForeignKey(connection, "fk_partner_applications_submitted_user")) {
      await connection.execute(`
        ALTER TABLE partner_applications
        DROP FOREIGN KEY fk_partner_applications_submitted_user
      `);
      console.log("Dropped old foreign key");
    }

    if (await hasIndex(connection, "partner_applications", "partner_applications_email_idx")) {
      await connection.execute(`
        ALTER TABLE partner_applications
        DROP INDEX partner_applications_email_idx
      `);
      console.log("Dropped obsolete email index");
    }

    await connection.execute(`
      ALTER TABLE partner_applications
      MODIFY COLUMN submitted_by_user_id BIGINT UNSIGNED NOT NULL
    `);

    if (hasNameColumn) {
      await connection.execute(`
        ALTER TABLE partner_applications
        DROP COLUMN name
      `);
      console.log("Dropped partner_applications.name");
    }

    if (hasEmailColumn) {
      await connection.execute(`
        ALTER TABLE partner_applications
        DROP COLUMN email
      `);
      console.log("Dropped partner_applications.email");
    }

    if (hasPhoneColumn) {
      await connection.execute(`
        ALTER TABLE partner_applications
        DROP COLUMN phone
      `);
      console.log("Dropped partner_applications.phone");
    }

    if (!(await hasIndex(connection, "partner_applications", "partner_applications_status_idx"))) {
      await connection.execute(`
        ALTER TABLE partner_applications
        ADD INDEX partner_applications_status_idx (status)
      `);
    }

    if (!(await hasIndex(connection, "partner_applications", "partner_applications_user_id_idx"))) {
      await connection.execute(`
        ALTER TABLE partner_applications
        ADD INDEX partner_applications_user_id_idx (submitted_by_user_id)
      `);
    }

    await connection.execute(`
      ALTER TABLE partner_applications
      ADD CONSTRAINT fk_partner_applications_submitted_user
      FOREIGN KEY (submitted_by_user_id) REFERENCES users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);

    const [columns] = await connection.execute(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'partner_applications'
        ORDER BY ORDINAL_POSITION
      `
    );

    console.log("Refactor complete. Current partner_applications columns:");
    for (const column of columns) {
      console.log(`- ${column.COLUMN_NAME}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
