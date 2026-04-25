import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, originalHash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !originalHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const originalBuffer = Buffer.from(originalHash, "base64url");

  if (derivedKey.length !== originalBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, originalBuffer);
}

export function validatePassword(password: string, email: string) {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password minimal 8 karakter.");
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    errors.push("Password harus memakai huruf besar dan kecil.");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password harus mengandung angka.");
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("Password harus mengandung simbol.");
  }

  if (email && password.toLowerCase().includes(email.toLowerCase())) {
    errors.push("Password tidak boleh sama atau mengandung email.");
  }

  return errors;
}
