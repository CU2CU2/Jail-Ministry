import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role, VolunteerStatus, UserCounty } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { church: true },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        if (user.status === "PENDING") {
          throw new Error("PENDING_APPROVAL");
        }
        if (user.status === "REJECTED" || user.status === "INACTIVE") {
          throw new Error("ACCOUNT_INACTIVE");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          county: user.county,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // NextAuth v5: user in the JWT callback is typed as the internal User|AdapterUser
        // which doesn't carry our custom fields. Cast through unknown to get our fields.
        const u = user as unknown as { id: string; role: Role; status: VolunteerStatus; county: UserCounty | null };
        token.id = u.id;
        token.role = u.role;
        token.status = u.status;
        token.county = u.county;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.status = token.status as VolunteerStatus;
        session.user.county = (token.county ?? null) as UserCounty | null;
      }
      return session;
    },
  },
});
