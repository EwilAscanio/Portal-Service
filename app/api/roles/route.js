import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findAllRoles } from "@/lib/repositories/user.repository";
import { isSuperAdmin, ROLES } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    const allRoles = await findAllRoles();
    const roles = isSuperAdmin(session.user.role)
      ? allRoles
      : allRoles.filter((role) => role.name !== ROLES.SUPER_ADMIN);
    return NextResponse.json(roles);
  } catch (error) {
    console.error("[GET /api/roles]", error);
    return NextResponse.json({ error: "Error al cargar roles." }, { status: 500 });
  }
}
