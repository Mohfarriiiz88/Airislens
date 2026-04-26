import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import {
  findUserById,
  listUsersForSuperadmin,
  updateUserRole,
} from "@/lib/auth/users";

type AllowedRole = "admin" | "user";

function isAllowedRole(role: unknown): role is AllowedRole {
  return role === "admin" || role === "user";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.role !== "superadmin") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    role?: string;
  };
  const { id } = await context.params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json(
      { message: "ID user tidak valid." },
      { status: 400 }
    );
  }

  if (!isAllowedRole(body.role)) {
    return NextResponse.json(
      { message: "Role yang diizinkan hanya admin atau user." },
      { status: 400 }
    );
  }

  const targetUser = await findUserById(userId);

  if (!targetUser) {
    return NextResponse.json(
      { message: "User tidak ditemukan." },
      { status: 404 }
    );
  }

  if (targetUser.role === "superadmin") {
    return NextResponse.json(
      { message: "Role superadmin tidak bisa diubah dari panel ini." },
      { status: 400 }
    );
  }

  await updateUserRole({
    id: userId,
    role: body.role,
  });

  const users = await listUsersForSuperadmin();
  const updatedUser = users.find((user) => user.id === userId) ?? null;

  return NextResponse.json({
    message:
      body.role === "admin"
        ? "Client berhasil diangkat menjadi partner."
        : "Partner berhasil diturunkan menjadi client.",
    user: updatedUser,
  });
}
