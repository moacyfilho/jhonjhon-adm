import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import * as bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("[AUTH] Starting authorization...");

          if (!credentials?.email || !credentials?.password) {
            console.log("[AUTH] Missing credentials");
            throw new Error("Email e senha são obrigatórios");
          }

          const email = credentials.email.toLowerCase();
          console.log("[AUTH] Looking up user:", email);
          const user = await prisma.user.findUnique({
            where: {
              email: email,
            },
          });

          if (!user || !user?.password) {
            console.log("[AUTH] User not found or no password");
            throw new Error("Credenciais inválidas");
          }

          console.log("[AUTH] User found, comparing passwords...");
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.log("[AUTH] Invalid password");
            throw new Error("Credenciais inválidas");
          }

          console.log("[AUTH] Authentication successful for:", user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("[AUTH] Authorization error:", error);
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
