import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  findById,
  update,
  setStatus,
  existsByLoginOrEmail,
} from "@/lib/repositories/user.repository";

export async function GET(_request, { params }) {
  const { id } = await params;
  const user = await findById(id);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const { login, name, email, roleId, status, password } = body;

    if (!login?.trim() || !name?.trim() || !email?.trim() || !roleId) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: login, name, email, roleId." },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const conflict = await existsByLoginOrEmail({ login, email, excludeId: id });
    const errors = [];
    if (conflict.login_taken) errors.push("El usuario ya está registrado.");
    if (conflict.email_taken) errors.push("El correo ya está registrado.");
    if (errors.length) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 409 });
    }

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
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus || !["Activo", "Inactivo"].includes(newStatus)) {
      return NextResponse.json(
        { error: "El estado debe ser 'Activo' o 'Inactivo'." },
        { status: 400 }
      );
    }

    const updated = await setStatus(id, newStatus);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar el estado." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const existing = await findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const updated = await setStatus(id, "Inactivo");
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar el usuario." }, { status: 500 });
  }
}
