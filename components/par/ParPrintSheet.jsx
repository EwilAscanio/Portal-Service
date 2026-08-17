import { formatNumber } from "@/utils/parCalc";

/**
 * Hoja oficial A4 (formato PAR) usada únicamente para imprimir.
 * Se mantiene oculta en pantalla (`hidden print:block`) y solo aparece al
 * imprimir desde la vista previa del PAR. Port de par_code/ParPreview.tsx.
 */
export function ParPrintSheet({ par }) {
  const items = par.items ?? [];
  const equipment = par.equipment ?? [];
  const totalUsd = Number(par.total_usd || 0);
  const totalBs = Number(par.total_bs || 0);
  const rate = Number(par.exchange_rate || 0);
  const fecha = par.fecha_emision ? String(par.fecha_emision).slice(0, 10) : "";

  return (
    <div className="hidden print:block">
      <div className="mx-auto max-w-5xl px-4 print:my-0 print:max-w-none print:px-0">
        <div className="border-2 border-slate-800 bg-white p-6 font-sans text-slate-900 sm:p-8 print:border print:p-4 print:m-0 print:shadow-none">
          {/* Encabezado del documento */}
          <div className="mb-3 border-b-2 border-slate-800 pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center border border-slate-900 bg-slate-900 text-xl font-black text-white">
                  M
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-900">
                    MAQUITECH Distribuidores C.A.
                  </h1>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Venta, Servicio y Mantenimiento de Equipos Industriales
                  </p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-black uppercase text-slate-900">
                  Planilla de Atención de Requisición de Cliente (PAR)
                </h2>
                <div className="mt-0.5 text-lg font-black text-indigo-900">
                  NRO. <span className="underline">{par.par_number}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="mb-3 divide-y divide-slate-800 border border-slate-800 text-xs font-semibold">
            <div className="grid grid-cols-12 divide-x divide-slate-800">
              <div className="col-span-2 bg-slate-100 p-1.5 text-[11px] uppercase">EMPRESA:</div>
              <div className="col-span-10 p-1.5 font-bold uppercase">{par.client_name}</div>
            </div>
            <div className="grid grid-cols-12 divide-x divide-slate-800">
              <div className="col-span-2 bg-slate-100 p-1.5 text-[11px] uppercase">ATENCION:</div>
              <div className="col-span-6 p-1.5 font-bold uppercase">{par.atencion}</div>
              <div className="col-span-2 bg-slate-100 p-1.5 text-center text-[11px] uppercase">
                FECHA
              </div>
              <div className="col-span-2 p-1.5 text-center font-bold">{fecha}</div>
            </div>
            <div className="grid grid-cols-12 divide-x divide-slate-800">
              <div className="col-span-2 bg-slate-100 p-1.5 text-[11px] uppercase">TELEFONO:</div>
              <div className="col-span-6 p-1.5 font-medium">{par.client_phone || "—"}</div>
              <div className="col-span-4 bg-slate-50 p-1.5 text-center text-[10px] font-bold italic text-slate-700">
                CÓDIGO INTERNO: PAR-{par.par_number}
              </div>
            </div>
            <div className="grid grid-cols-12 divide-x divide-slate-800">
              <div className="col-span-2 bg-slate-100 p-1.5 text-[11px] uppercase">DIRECCION:</div>
              <div className="col-span-10 p-1.5 font-medium uppercase">{par.client_address}</div>
            </div>
          </div>

          {/* Datos de equipos */}
          <div className="mb-3">
            <div className="border border-b-0 border-slate-800 bg-slate-200 py-1 text-center text-xs font-bold uppercase text-slate-900">
              Datos de Equipos
            </div>
            <table className="w-full border-collapse border border-slate-800 text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-100 text-[10px] font-bold uppercase">
                  <th className="w-12 border-r border-slate-800 p-1 text-center">Item</th>
                  <th className="border-r border-slate-800 p-1 text-center">Tipo</th>
                  <th className="border-r border-slate-800 p-1 text-center">Marca</th>
                  <th className="border-r border-slate-800 p-1 text-center">SERIAL</th>
                  <th className="border-r border-slate-800 p-1 text-center">MODELO</th>
                  <th className="p-1 text-center">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq, index) => (
                  <tr key={eq.id ?? index} className="border-b border-slate-800 text-[11px]">
                    <td className="border-r border-slate-800 p-1.5 text-center font-bold">
                      {eq.item_no ?? index + 1}
                    </td>
                    <td className="border-r border-slate-800 p-1.5 font-semibold uppercase">
                      {eq.tipo}
                    </td>
                    <td className="border-r border-slate-800 p-1.5 text-center uppercase">
                      {eq.marca}
                    </td>
                    <td className="border-r border-slate-800 p-1.5 text-center font-mono">
                      {eq.serial}
                    </td>
                    <td className="border-r border-slate-800 p-1.5 text-center">{eq.modelo}</td>
                    <td className="p-1.5 text-[10px] font-medium uppercase">{eq.observaciones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tasa vigente */}
          <div className="mb-3 flex items-center justify-between border-2 border-slate-800 bg-slate-100 p-1.5 text-xs font-bold">
            <span className="uppercase tracking-wider">TASA VIGENTE DEL DIA</span>
            <span className="border border-slate-800 bg-white px-3 py-0.5 font-mono text-sm">
              Bs. {formatNumber(rate)}
            </span>
          </div>

          {/* Ítems / costos */}
          <div className="mb-3">
            <div className="border border-b-0 border-slate-800 bg-slate-200 py-1 text-center text-[11px] font-bold italic text-slate-800">
              Equipos o Repuestos requeridos (Anexe formato de PMU si lo necesita)
            </div>
            <table className="w-full border-collapse border border-slate-800 text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-100 text-[10px] font-bold uppercase">
                  <th className="w-10 border-r border-slate-800 p-1 text-center">Qty</th>
                  <th className="border-r border-slate-800 p-1">Descripción</th>
                  <th className="w-12 border-r border-slate-800 p-1 text-center">CCN</th>
                  <th className="w-14 border-r border-slate-800 p-1 text-center">US List</th>
                  <th className="w-12 border-r border-slate-800 p-1 text-center">Multip,</th>
                  <th className="w-20 border-r border-slate-800 p-1 text-right">Valor Unit.</th>
                  <th className="w-24 border-r border-slate-800 p-1 text-right">TOTALES DOLARES</th>
                  <th className="w-28 p-1 text-right">BOLIVARES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                {items.map((item, index) => {
                  const lineUsd = Number(item.line_total_usd || 0);
                  const lineBs = lineUsd * rate;
                  return (
                    <tr key={item.id ?? index}>
                      <td className="border-r border-slate-800 p-1 text-center font-bold">
                        {item.qty !== null && item.qty !== "" && Number(item.qty) > 0
                          ? item.qty
                          : ""}
                      </td>
                      <td className="border-r border-slate-800 p-1 font-medium">{item.descripcion}</td>
                      <td className="border-r border-slate-800 p-1 text-center text-[10px]">
                        {item.ccn}
                      </td>
                      <td className="border-r border-slate-800 p-1 text-center text-[10px]">
                        {item.us_list}
                      </td>
                      <td className="border-r border-slate-800 p-1 text-center font-mono text-[10px]">
                        {item.multiplicador ? Number(item.multiplicador).toFixed(2) : ""}
                      </td>
                      <td className="border-r border-slate-800 p-1 text-right font-mono text-[10px]">
                        {item.valor_unit_usd !== null &&
                        item.valor_unit_usd !== "" &&
                        Number(item.valor_unit_usd) > 0
                          ? formatNumber(Number(item.valor_unit_usd))
                          : ""}
                      </td>
                      <td className="border-r border-slate-800 p-1 text-right font-mono font-bold">
                        {lineUsd > 0 ? formatNumber(lineUsd) : ""}
                      </td>
                      <td className="p-1 text-right font-mono font-bold">
                        {lineBs > 0 ? formatNumber(lineBs) : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="mb-4 divide-y divide-slate-800 border border-slate-800 text-xs">
            <div className="grid grid-cols-12 divide-x divide-slate-800 font-bold">
              <div className="col-span-8 bg-slate-100 p-1.5 text-right uppercase">SUB-TOTAL BsS</div>
              <div className="col-span-4 p-1.5 text-right font-mono">-</div>
            </div>
            <div className="grid grid-cols-12 divide-x divide-slate-800 bg-slate-200 font-bold">
              <div className="col-span-6 p-2 text-right text-sm uppercase">TOTAL</div>
              <div className="col-span-3 p-2 text-right font-mono text-sm text-indigo-950">
                $ {formatNumber(totalUsd)}
              </div>
              <div className="col-span-3 p-2 text-right font-mono text-sm font-black text-slate-900">
                Bs. {formatNumber(totalBs)}
              </div>
            </div>
          </div>

          {/* Firmas */}
          <div className="grid grid-cols-2 divide-x divide-slate-800 border border-slate-800 text-xs">
            <div className="p-3 text-center">
              <div className="mb-6 text-[10px] font-bold uppercase text-slate-500">Elaborado por:</div>
              <div className="inline-block border-t border-slate-400 px-8 pt-1 font-bold uppercase">
                {par.elaborado_por || "—"}
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="mb-6 text-[10px] font-bold uppercase text-slate-500">
                Revisado y Aprobado por:
              </div>
              <div className="inline-block border-t border-slate-400 px-8 pt-1 font-bold uppercase">
                {par.approved_by_name || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
