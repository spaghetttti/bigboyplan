import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

export default {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret:
        process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
  ],
} satisfies NextAuthConfig;
