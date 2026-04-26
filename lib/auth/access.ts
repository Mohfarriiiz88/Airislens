import { type JwtPayload } from "@/lib/auth/jwt";
import { getServerSession } from "@/lib/auth/session";
import { type UserRole } from "@/lib/auth/users";

export type AuthorizedSession = {
  session: JwtPayload;
  userId: number;
};

export async function requireSessionWithRole(
  roles: UserRole[]
): Promise<AuthorizedSession | null> {
  const session = await getServerSession();

  if (!session || !roles.includes(session.role)) {
    return null;
  }

  const userId = Number(session.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return {
    session,
    userId,
  };
}
