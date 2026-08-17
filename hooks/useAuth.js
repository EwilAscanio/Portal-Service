"use client";

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  const login = async (loginValue, password) => {
    const result = await nextAuthSignIn("credentials", {
      login: loginValue,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("Credenciales inválidas.");
    }

    return result;
  };

  const logout = async () => {
    await nextAuthSignOut({ redirect: false });
  };

  return {
    user: session?.user ?? null,
    loading: status === "loading",
    status,
    login,
    logout,
  };
}
