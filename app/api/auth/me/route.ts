import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { verifyJwt } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const session = await verifyJwt(token);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: Number(session.sub),
      name: session.name,
      email: session.email,
      role: session.role,
    },
  });
}
