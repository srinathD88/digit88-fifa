import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Domain restriction
      if (account?.provider === "google") {
        return profile?.email?.endsWith("@digit88.com") ?? false;
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        // Always trust DB for role and teamId
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, teamId: true }
        });

        if (dbUser) {
          (session.user as any).role = dbUser.role;
          (session.user as any).teamId = dbUser.teamId;
        }
      }
      return session;
    }
  },
})
