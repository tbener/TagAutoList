import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: { id: string } & NonNullable<import("next-auth").DefaultSession["user"]>;
  }
}

// Stateless JWT sessions; the user's Google `sub` is the account scope for all data.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.sub || !profile.email) return false;
      await db
        .insert(users)
        .values({
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture as string | undefined,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: profile.email,
            name: profile.name,
            image: profile.picture as string | undefined,
          },
        });
      return true;
    },
    jwt({ token, profile }) {
      if (profile?.sub) token.sub = profile.sub;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
});
