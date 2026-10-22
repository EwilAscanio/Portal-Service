import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findByLogin, findById, touchLastAccess } from "@/lib/repositories/user.repository";

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
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.login = user.login;
        token.role = user.role;
        token.status = user.status;
      } else if (token.id) {
        try {
          const currentUser = await findById(token.id);
          if (!currentUser || currentUser.status !== "Activo") {
            token.status = "Inactivo";
            token.role = null;
          } else {
            token.login = currentUser.login;
            token.role = currentUser.role;
            token.status = currentUser.status;
          }
        } catch {
          token.status = "Inactivo";
          token.role = null;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.login = token.login;
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
  },
});
