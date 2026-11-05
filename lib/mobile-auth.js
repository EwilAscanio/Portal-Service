import { NextResponse } from "next/server";
import { findById } from "@/lib/repositories/user.repository";
import { readMobileToken } from "@/lib/mobile-token";

function unauthorized(message = "No autenticado.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Lee el Bearer de la app móvil y confirma que el usuario siga Activo.
 * La sesión web de NextAuth no participa en estas rutas.
 */
export async function requireMobileUser(request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return { response: NextResponse.json({ error: "La autenticación móvil no está configurada." }, { status: 500 }) };
  }
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return { response: unauthorized() };

  let payload;
  try {
    payload = readMobileToken(match[1], secret);
  } catch {
    return { response: unauthorized("Sesión no válida.") };
  }

  const user = await findById(payload.id);
  if (!user || user.status !== "Activo") return { response: unauthorized("Sesión no válida.") };
  return { user };
}
