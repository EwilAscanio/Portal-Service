import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchClientsFromSaint } from "@/lib/saint-api";
import { beginSaintSync, failSaintSync, syncManyFromSaint } from "@/lib/repositories/client.repository";
import { normalizeSaintClientStatus } from "@/lib/saint-status";

export async function POST() {
  let runId;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const saintClients = await fetchClientsFromSaint();
    if (!Array.isArray(saintClients) || saintClients.length === 0) {
      throw new Error("Saint devolvió un catálogo de clientes vacío o inválido.");
    }
    const mapped = saintClients.map((item) => ({
      codclie: String(item.CodClie || "").trim(),
      description: item.Descrip || null,
      rif: item.ID3 || null,
      address1: item.Direc1 || null,
      address2: item.Direc2 || null,
      status: normalizeSaintClientStatus(item.Activo),
      country: item.Pais != null ? String(item.Pais) : null,
      state: item.Estado != null ? String(item.Estado) : null,
      phone: item.Telef || null,
      email: item.Email || null,
      mobile: item.Movil || null,
    }));
    if (mapped.some((item) => !item.codclie)) throw new Error("Saint devolvió clientes sin código.");
    const codes = mapped.map((item) => item.codclie);
    if (new Set(codes).size !== codes.length) throw new Error("Saint devolvió códigos de cliente duplicados.");

    runId = await beginSaintSync(mapped.length);
    const stats = await syncManyFromSaint(mapped, runId);
    const parts = [`${mapped.length} procesados`];
    if (stats.inserted) parts.push(`${stats.inserted} nuevos`);
    if (stats.updated) parts.push(`${stats.updated} actualizados`);
    if (stats.activated) parts.push(`${stats.activated} activados`);
    if (stats.deactivated) parts.push(`${stats.deactivated} desactivados`);
    return NextResponse.json({ count: mapped.length, ...stats, runId, message: `Se sincronizaron ${parts.join(", ")}.` });
  } catch (error) {
    if (runId) await failSaintSync(runId, String(error)).catch(() => {});
    console.error("[POST /api/client/sync]", error);
    return NextResponse.json({ error: "Error al sincronizar clientes desde Saint." }, { status: 500 });
  }
}
