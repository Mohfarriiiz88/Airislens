import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { listUsersForSuperadmin } from "@/lib/auth/users";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.role !== "superadmin") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const users = await listUsersForSuperadmin();

  return NextResponse.json({ users });
}
