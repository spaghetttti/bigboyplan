import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

/** Returns the authenticated user's DB id. Redirects to login if not signed in, force-signout if the session is stale (user deleted from DB). */
export async function requireAuth(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) redirect("/api/force-signout");
  return id;
}
