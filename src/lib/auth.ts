import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user?.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        // esOwner: ¿tiene alguna Membresia con rol OWNER? Determina si ve el
        // panel "Equipo" (Fase 2) — igual que esSuperAdmin, es un hint para
        // el JWT/UI, no la autorización real (esa se re-verifica en la API).
        const esOwner = await db.membresia.findFirst({
          where: { userId: user.id, rol: "OWNER", aceptada: true },
          select: { id: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          esSuperAdmin: user.esSuperAdmin,
          esOwner: !!esOwner,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.esSuperAdmin = (user as any).esSuperAdmin ?? false;
        token.esOwner = (user as any).esOwner ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).esSuperAdmin = token.esSuperAdmin ?? false;
        (session.user as any).esOwner = token.esOwner ?? false;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
