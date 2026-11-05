import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchVendorsFromSaint } from "@/lib/saint-api";
import { beginVendorSync, failVendorSync, syncManyFromSaint } from "@/lib/repositories/vendor.repository";
import { normalizeSaintClientStatus } from "@/lib/saint-status";

function blankToNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function locationCode(value) {
  const code = blankToNull(value);
  // Saint envía 0 cuando el vendedor no tiene país, estado o ciudad.
  return code === "0" ? null : code;
}

export async function POST() {
  let runId;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const saintVendors = await fetchVendorsFromSaint();
    if (!Array.isArray(saintVendors) || saintVendors.length === 0) {
      throw new Error("Saint devolvió un catálogo de vendedores vacío o inválido.");
    }
    const mapped = saintVendors.map((item) => ({
      codvend: String(item.CodVend || "").trim(),
      description: blankToNull(item.Descrip),
      cedula: blankToNull(item.ID3),
      phone: blankToNull(item.Telef),
      status: normalizeSaintClientStatus(item.Activo),
      email: blankToNull(item.Email),
      country: locationCode(item.Pais),
      state: locationCode(item.Estado),
      city: locationCode(item.Ciudad),
    }));
    if (mapped.some((item) => !item.codvend)) throw new Error("Saint devolvió vendedores sin código.");
    const codes = mapped.map((item) => item.codvend);
    if (new Set(codes).size !== codes.length) throw new Error("Saint devolvió códigos de vendedor duplicados.");

    runId = await beginVendorSync(mapped.length);
    const stats = await syncManyFromSaint(mapped, runId);
    const parts = [`${mapped.length} procesados`];
    if (stats.inserted) parts.push(`${stats.inserted} nuevos`);
    if (stats.updated) parts.push(`${stats.updated} actualizados`);
    if (stats.activated) parts.push(`${stats.activated} activados`);
    if (stats.deactivated) parts.push(`${stats.deactivated} desactivados`);
    return NextResponse.json({ count: mapped.length, ...stats, runId, message: `Se sincronizaron ${parts.join(", ")}.` });
  } catch (error) {
    if (runId) await failVendorSync(runId, String(error)).catch(() => {});
    console.error("[POST /api/vendor/sync]", error);
    return NextResponse.json({ error: "Error al sincronizar vendedores desde Saint." }, { status: 500 });
  }
}
