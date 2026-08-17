import { NextResponse } from "next/server";
import { fetchClientsFromSaint } from "@/lib/saint-api";
import { upsertMany, getExistingStatusMap, getAllCodclies } from "@/lib/repositories/client.repository";

export async function POST() {
  try {
    const saintClients = await fetchClientsFromSaint();

    const mapped = saintClients.map((c) => ({
      codclie:     String(c.CodClie || ""),
      description: c.Descrip || null,
      rif:         c.ID3 || null,
      address1:    c.Direc1 || null,
      address2:    c.Direc2 || null,
      status:      String(c.Activo ?? "1"),
      country:     c.Pais != null ? String(c.Pais) : null,
      state:       c.Estado != null ? String(c.Estado) : null,
      phone:       c.Telef || null,
      email:       c.Email || null,
      mobile:      c.Movil || null,
    }));

    const existingCodclies = await getAllCodclies();
    const existingSet = new Set(existingCodclies);

    const existingStatuses = await getExistingStatusMap();

    let inserted = 0;
    let updated = 0;
    let activated = 0;
    let deactivated = 0;

    for (const c of mapped) {
      if (!existingSet.has(c.codclie)) {
        inserted++;
      } else {
        updated++;
        const previousStatus = existingStatuses[c.codclie];
        if (previousStatus === "0" && c.status === "1") activated++;
        if (previousStatus === "1" && c.status === "0") deactivated++;
      }
    }

    await upsertMany(mapped);

    const parts = [];
    parts.push(`${mapped.length} procesados`);
    if (inserted > 0) parts.push(`${inserted} nuevos`);
    if (updated > 0) parts.push(`${updated} actualizados`);
    if (activated > 0) parts.push(`${activated} activados`);
    if (deactivated > 0) parts.push(`${deactivated} desactivados`);

    return NextResponse.json({
      count: mapped.length,
      inserted,
      updated,
      activated,
      deactivated,
      message: `Se sincronizaron ${parts.join(", ")}.`,
    });
  } catch (error) {
    console.error("[POST /api/clients/sync]", error);
    return NextResponse.json(
      { error: error.message || "Error al sincronizar clientes desde Saint." },
      { status: 500 }
    );
  }
}
