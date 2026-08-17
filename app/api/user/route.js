import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findAll, create, existsByLoginOrEmail } from "@/lib/repositories/user.repository";

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
    const body = await request.json();
    const { login, name, email, password, roleId, status } = body;

    if (!login?.trim() || !name?.trim() || !email?.trim() || !password || !roleId) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: login, name, email, password, roleId." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const conflict = await existsByLoginOrEmail({ login, email });
    const errors = [];
    if (conflict.login_taken) errors.push("El usuario ya está registrado.");
    if (conflict.email_taken) errors.push("El correo ya está registrado.");
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
