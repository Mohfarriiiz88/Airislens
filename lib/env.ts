function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getDatabaseConfig() {
  return {
    host: getRequiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? "3306"),
    user: getRequiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: getRequiredEnv("DB_NAME"),
  };
}

export function getJwtSecret() {
  return getRequiredEnv("JWT_SECRET");
}
