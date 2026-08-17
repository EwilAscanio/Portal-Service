import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findByLogin, touchLastAccess } from "@/lib/repositories/user.repository";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        login: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const login = credentials?.login?.trim();
        const password = credentials?.password;
        if (!login || !password) return null;

        const user = await findByLogin(login);
        if (!user) return null;
        if (user.status !== "Activo") return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        // Fire-and-forget: record last access without blocking the login.
        touchLastAccess(user.id).catch(() => {});

        return {
          id: user.id,
          login: user.login,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.login = user.login;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.login = token.login;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
