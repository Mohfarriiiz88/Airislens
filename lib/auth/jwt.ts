import { getJwtSecret } from "@/lib/env";

export type JwtPayload = {
  sub: string;
  name: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();

function encodeBase64Url(value: string | Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getJwtSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJwt(
  payload: Omit<JwtPayload, "iat" | "exp">,
  expiresInSeconds: number
) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(JSON.stringify(fullPayload));
  const unsignedToken = `${header}.${body}`;
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(unsignedToken)
  );

  return `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyJwt(token: string) {
  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature) {
    return null;
  }

  const key = await getSigningKey();
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(signature),
    encoder.encode(`${header}.${body}`)
  );

  if (!isValid) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body).toString("utf8")) as JwtPayload;

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
