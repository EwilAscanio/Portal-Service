import { createHmac, timingSafeEqual } from "node:crypto";

/** Audiencia exclusiva del JWT de la app de visitas. No es la sesión web. */
export const MOBILE_AUDIENCE = "maquitech-mobile";

/** Noventa días, en segundos. */
export const MOBILE_TOKEN_SECONDS = 90 * 24 * 60 * 60;

function sign(data, secret) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/**
 * Firma el perfil del usuario activo. El teléfono guarda este token y entra sin red
 * mientras no venza. Cada request con internet vuelve a leer users.status.
 */
export function signMobileToken(user, secret, now = Date.now()) {
  if (!secret) throw new Error("AUTH_SECRET no está configurado.");
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + MOBILE_TOKEN_SECONDS;
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = {
    id: user.id,
    login: user.login,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    aud: MOBILE_AUDIENCE,
    iat: issuedAt,
    exp: expiresAt,
  };
  const body = encode(payload);
  const token = `${header}.${body}.${sign(`${header}.${body}`, secret)}`;
  return { token, expiresAt: new Date(expiresAt * 1000).toISOString(), payload };
}

/** Verifica firma, audiencia y vencimiento. No consulta la base. */
export function readMobileToken(token, secret, now = Date.now()) {
  if (!secret) throw new Error("AUTH_SECRET no está configurado.");
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("Token inválido.");
  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`, secret);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
    throw new Error("Token inválido.");
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("Token inválido.");
  }
  if (payload?.aud !== MOBILE_AUDIENCE || !payload.id || !payload.exp || payload.exp * 1000 <= now) {
    throw new Error("La sesión expiró.");
  }
  return payload;
}
