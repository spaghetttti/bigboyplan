import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { upsertUserFromGitHub } from "@/lib/auth/upsert-github-user";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ profile }) {
      if (!profile || !("id" in profile) || profile.id == null) {
        console.error("[auth] signIn: Missing profile or profile.id");
        return false;
      }
      try {
        await upsertUserFromGitHub({
          id: profile.id as string | number,
          login: "login" in profile ? (profile.login as string) : undefined,
          email: "email" in profile ? (profile.email as string | null) : null,
          avatar_url:
            "avatar_url" in profile ? (profile.avatar_url as string | null) : null,
        });
        return true;
      } catch (error) {
        console.error("[auth] signIn: Error upserting user:", error);
        return false;
      }
    },
    async jwt({ token, account, profile }) {
      if (account && profile && "id" in profile && profile.id != null) {
        const row = await prisma.user.findUnique({
          where: { githubId: String(profile.id) },
        });
        if (row) {
          token.sub = row.id;
          token.name = row.githubLogin;
          token.email = row.email ?? undefined;
          token.picture = row.avatarUrl ?? undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
