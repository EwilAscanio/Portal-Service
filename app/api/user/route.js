import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { findAll, create, existsByLoginOrEmail, findRoleById } from "@/lib/repositories/user.repository";
import { userSchema } from "@/lib/validators";
import { isSuperAdmin, ROLES } from "@/lib/permissions";

export async function GET() {
  try {
    const users = await findAll();
    return NextResponse.json(users);
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Error al cargar usuarios." }, { status: 500 });
  }
}
export async function POST(request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    const parsed = userSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos de usuario inválidos." }, { status: 400 });
    }
    const { login, name, email, password, roleId, status } = parsed.data;
    const targetRole = await findRoleById(roleId);
    if (!targetRole) return NextResponse.json({ error: "Rol no encontrado." }, { status: 400 });
    if (targetRole.name === ROLES.SUPER_ADMIN && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Solo un Superadministrador puede asignar este rol." }, { status: 403 });
    }

    const conflict = await existsByLoginOrEmail({ login, email });
    const errors = [];
    if (conflict.login_taken) errors.push("El usuario ya estÃ¡ registrado.");
    if (conflict.email_taken) errors.push("El correo ya estÃ¡ registrado.");
    if (errors.length) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await create({
      login: login.trim(),
      name: name.trim(),
      email: email.trim(),
      passwordHash,
      roleId,
      status: status || "Activo",
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear el usuario." }, { status: 500 });
  }
}
