import "server-only";

import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { getSettingsEncryptionKey } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
};

function getKey() {
  const key = Buffer.from(getSettingsEncryptionKey(), "base64");

  if (key.length !== 32) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY harus berupa 32 byte yang di-encode base64."
    );
  }

  return key;
}

export function encryptSecret(plainText: string): EncryptedSecret {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(secret: EncryptedSecret): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(secret.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(secret.tag, "base64"));

  const plainText = Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plainText.toString("utf8");
}
