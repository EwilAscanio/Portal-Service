import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findByLogin, touchLastAccess } from "@/lib/repositories/user.repository";
import { signMobileToken } from "@/lib/mobile-token";
import { mobileLoginSchema } from "@/lib/validators/mobile.schema";

const PRIVATE = { "Cache-Control": "private, no-store" };

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = mobileLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400, headers: PRIVATE });
    }
    if (!process.env.AUTH_SECRET) {
      return NextResponse.json({ error: "La autenticación móvil no está configurada." }, { status: 500, headers: PRIVATE });
    }

    const user = await findByLogin(parsed.data.login);
    const valid = user?.status === "Activo" && await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401, headers: PRIVATE });
    }

    touchLastAccess(user.id).catch(() => {});
    const profile = {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    const signed = signMobileToken(profile, process.env.AUTH_SECRET);
    return NextResponse.json({
      token: signed.token,
      expires_at: signed.expiresAt,
      user: profile,
    }, { headers: PRIVATE });
  } catch (error) {
    console.error("[POST /api/mobile/auth]", error);
    return NextResponse.json({ error: "Error al iniciar sesión." }, { status: 500, headers: PRIVATE });
  }
}
