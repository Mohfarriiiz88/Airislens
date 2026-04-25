import { cookies } from "next/headers";

import { signJwt, verifyJwt, type JwtPayload } from "@/lib/auth/jwt";
import { type SafeUser } from "@/lib/auth/users";

export const AUTH_COOKIE_NAME = "airislens_auth";
const AUTH_MAX_AGE = 60 * 60 * 24 * 7;

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  };
}

export async function createSessionToken(user: SafeUser) {
  return signJwt(
    {
      sub: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    AUTH_MAX_AGE
  );
}

export async function getServerSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyJwt(token);
}
