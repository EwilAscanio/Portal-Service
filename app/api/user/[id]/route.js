import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import {
  countActiveUsersByRoleName,
  findById,
  findRoleById,
  update,
  setStatus,
  existsByLoginOrEmail,
} from "@/lib/repositories/user.repository";
import { userStatusSchema, userUpdateSchema } from "@/lib/validators";
import { isSuperAdmin, ROLES } from "@/lib/permissions";

function forbiddenSuperAdminManagement(session, user) {
  return user.role === ROLES.SUPER_ADMIN && !isSuperAdmin(session.user.role);
}

async function wouldRemoveLastActiveSuperAdmin(user, nextRole, nextStatus) {
  if (user.role !== ROLES.SUPER_ADMIN || user.status !== "Activo") return false;
  if (nextRole === ROLES.SUPER_ADMIN && nextStatus === "Activo") return false;
  return (await countActiveUsersByRoleName(ROLES.SUPER_ADMIN)) <= 1;
}

export async function GET(_request, { params }) {
  const { id } = await params;
  const user = await findById(id);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    if (forbiddenSuperAdminManagement(session, existing)) {
      return NextResponse.json({ error: "Solo un Superadministrador puede modificar esta cuenta." }, { status: 403 });
    }

    const parsed = userUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos de usuario inválidos." }, { status: 400 });
    }
    const { login, name, email, roleId, status, password } = parsed.data;
    const targetRole = await findRoleById(roleId);
    if (!targetRole) return NextResponse.json({ error: "Rol no encontrado." }, { status: 400 });
    if (targetRole.name === ROLES.SUPER_ADMIN && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Solo un Superadministrador puede asignar este rol." }, { status: 403 });
    }
    const nextStatus = status || existing.status;
    if (session.user.id === id && existing.role === ROLES.SUPER_ADMIN &&
        (targetRole.name !== ROLES.SUPER_ADMIN || nextStatus !== "Activo")) {
      return NextResponse.json({ error: "No puedes retirar tu propio acceso de Superadministrador." }, { status: 409 });
    }
    if (await wouldRemoveLastActiveSuperAdmin(existing, targetRole.name, nextStatus)) {
      return NextResponse.json({ error: "Debe permanecer al menos un Superadministrador activo." }, { status: 409 });
    }

    const conflict = await existsByLoginOrEmail({ login, email, excludeId: id });
    const errors = [];
    if (conflict.login_taken) errors.push("El usuario ya está registrado.");
    if (conflict.email_taken) errors.push("El correo ya está registrado.");
    if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 409 });

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const updated = await update(id, {
      login: login.trim(),
      name: name.trim(),
      email: email.trim(),
      roleId,
      status: status || existing.status,
      passwordHash,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar el usuario." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    if (forbiddenSuperAdminManagement(session, existing)) {
      return NextResponse.json({ error: "Solo un Superadministrador puede modificar esta cuenta." }, { status: 403 });
    }

    const parsed = userStatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Estado de usuario inválido." }, { status: 400 });
    }
    if (session.user.id === id && existing.role === ROLES.SUPER_ADMIN && parsed.data.status !== "Activo") {
      return NextResponse.json({ error: "No puedes desactivar tu propia cuenta de Superadministrador." }, { status: 409 });
    }
    if (await wouldRemoveLastActiveSuperAdmin(existing, existing.role, parsed.data.status)) {
      return NextResponse.json({ error: "Debe permanecer al menos un Superadministrador activo." }, { status: 409 });
    }
    const updated = await setStatus(id, parsed.data.status);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar el estado." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    if (forbiddenSuperAdminManagement(session, existing)) {
      return NextResponse.json({ error: "Solo un Superadministrador puede modificar esta cuenta." }, { status: 403 });
    }
    if (session.user.id === id && existing.role === ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "No puedes desactivar tu propia cuenta de Superadministrador." }, { status: 409 });
    }
    if (await wouldRemoveLastActiveSuperAdmin(existing, existing.role, "Inactivo")) {
      return NextResponse.json({ error: "Debe permanecer al menos un Superadministrador activo." }, { status: 409 });
    }
    const updated = await setStatus(id, "Inactivo");
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar el usuario." }, { status: 500 });
  }
}
