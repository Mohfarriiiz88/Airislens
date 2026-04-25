import mysql, { type Pool } from "mysql2/promise";

import { getDatabaseConfig } from "@/lib/env";

declare global {
  var __airislensDbPool: Pool | undefined;
}

export function getDbPool() {
  if (!global.__airislensDbPool) {
    global.__airislensDbPool = mysql.createPool({
      ...getDatabaseConfig(),
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
    });
  }

  return global.__airislensDbPool;
}
