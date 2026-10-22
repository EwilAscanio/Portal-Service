import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { REPORT_TYPES, reportDate, reportHistoricalNotes, reportNumber } from "@/lib/reports";

const styles = StyleSheet.create({
  page: { paddingTop: 238, paddingBottom: 44, paddingHorizontal: 32, fontFamily: "Helvetica", fontSize: 8, color: "#172033", lineHeight: 1.35 },
  header: { position: "absolute", top: 24, left: 32, right: 32 },
  company: { height: 78, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1.5, borderBottomColor: "#1d4ed8", paddingBottom: 8 },
  logo: { width: 140, height: 47, objectFit: "contain" },
  companyText: { width: 590, textAlign: "right", fontSize: 7.5 },
  companyName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4 },
  meta: { fontSize: 7.5, color: "#475569", marginBottom: 3 },
  section: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#dbe2ea", alignItems: "stretch" },
  cell: { paddingVertical: 6, paddingHorizontal: 5 },
  columnHeader: { backgroundColor: "#17365d", color: "#ffffff", fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  alternate: { backgroundColor: "#f3f6fa" },
  total: { marginTop: 12, padding: 10, backgroundColor: "#eaf1fb", fontFamily: "Helvetica-Bold" },
  note: { marginTop: 8, fontSize: 8, color: "#475569" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, borderTopWidth: 0.5, borderTopColor: "#cbd5e1", paddingTop: 6, fontSize: 7, color: "#64748b", flexDirection: "row", justifyContent: "space-between" },
});

const PAR_COLUMNS = [
  { label: "PAR", width: 9 }, { label: "Creado el", width: 10 }, { label: "Cliente", width: 26 },
  { label: "Planta", width: 20 }, { label: "Estado", width: 12 },
  { label: "Horas presup.", width: 11, numeric: true }, { label: "Importe USD", width: 12, numeric: true },
];
const SUMMARY_COLUMNS = [
  { label: "Técnico", width: 40 }, { label: "O/S atendidas", width: 15, numeric: true },
  { label: "Estimadas (h)", width: 15, numeric: true }, { label: "Reales (h)", width: 15, numeric: true },
  { label: "Diferencia (h)", width: 15, numeric: true },
];
const DETAIL_COLUMNS = [
  { label: "O/S", width: 8 }, { label: "PAR", width: 8 }, { label: "Cliente", width: 18 },
  { label: "Cierre", width: 9 }, { label: "Renglón / servicio", width: 31 },
  { label: "Est. (h)", width: 8, numeric: true }, { label: "Real (h)", width: 8, numeric: true },
  { label: "Dif. (h)", width: 10, numeric: true },
];

function Row({ columns, values, header = false, alternate = false }) {
  return (
    <View wrap={false} style={[styles.row, header ? styles.columnHeader : alternate ? styles.alternate : {}]}>
      {columns.map((column, index) => (
        <Text key={column.label} style={[styles.cell, { width: `${column.width}%`, textAlign: column.numeric ? "right" : "left" }]}>
          {header ? column.label : String(values[index] ?? "—")}
        </Text>
      ))}
    </View>
  );
}

function filterText(report) {
  const { filters } = report;
  const dateLabel = filters.type === "pars" ? "Creación" : "Cierre";
  const period = `${filters.from ? filters.from.split("-").reverse().join("/") : "Sin fecha inicial"} a ${filters.to ? filters.to.split("-").reverse().join("/") : "Sin fecha final"}`;
  return `${report.clientName}  |  ${filters.type === "pars" ? `Estado: ${filters.status || "Todos"}` : report.technicianName}\n${dateLabel}: ${period}  |  Horario: Venezuela (America/Caracas)`;
}

function ReportPage({ report, logo, section, columns, children }) {
  const company = report.company;
  const title = REPORT_TYPES.find((type) => type.value === report.filters.type).label;
  return (
    <Page size="A4" orientation="landscape" style={styles.page} wrap>
      {/* Encabezado y columnas fijos se repiten cuando el detalle ocupa varias páginas. */}
      <View fixed style={styles.header}>
        <View style={styles.company}>
          {/* React PDF Image no es una imagen HTML; no usar next/image aquí. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={{ data: logo, format: "png" }} style={styles.logo} />
          <View style={styles.companyText}>
            <Text style={styles.companyName}>{company.company_name}</Text>
            <Text>{[company.rif && `RIF: ${company.rif}`, company.phone].filter(Boolean).join("  |  ")}</Text>
            {company.email && <Text>{company.email}</Text>}
            {company.address && <Text>{company.address}</Text>}
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>Generado: {reportDate(report.generatedAt, true)}  |  Usuario: {report.generatedBy}</Text>
        <Text style={styles.meta}>{filterText(report)}</Text>
        <Text style={styles.section}>{section}</Text>
        <Row columns={columns} header />
      </View>
      {children}
      <View style={styles.footer} fixed>
        <Text>MAQUITECH · Reportes de servicios · {reportDate(report.generatedAt, true)}</Text>
        <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
    </Page>
  );
}

function ReportDocument({ report, logo }) {
  const title = REPORT_TYPES.find((type) => type.value === report.filters.type).label;
  return (
    <Document title={title} author={report.generatedBy} subject="Reporte operativo Maquitech" creator="Portal de Servicios Maquitech" language="es-VE" creationDate={new Date(report.generatedAt)}>
      {report.filters.type === "pars" ? (
        <ReportPage report={report} logo={logo} columns={PAR_COLUMNS} section="PAR registrados">
          {report.rows.map((row, index) => <Row key={row.id} columns={PAR_COLUMNS} alternate={index % 2 === 1} values={[
            row.par_number, reportDate(row.created_at), row.client_name, row.plant_name, row.display_status,
            reportNumber(row.budgeted_hours), reportNumber(row.total_usd),
          ]} />)}
          <View wrap={false} style={styles.total}>
            <Text>{report.totals.pars} PAR  |  Horas presupuestadas: {reportNumber(report.totals.hours)} h  |  Importe total: USD {reportNumber(report.totals.usd)}</Text>
          </View>
          <Text style={styles.note}>Las horas presupuestadas provienen de la cantidad de los productos que requieren técnico. El multiplicador comercial no interviene en esas horas.</Text>
        </ReportPage>
      ) : (
        <>
          <ReportPage report={report} logo={logo} columns={SUMMARY_COLUMNS} section="Resumen por técnico · Solo órdenes cerradas con horas confirmadas">
            {report.groups.map((group, index) => <Row key={group.id} columns={SUMMARY_COLUMNS} alternate={index % 2 === 1} values={[
              group.name, group.orderCount, reportNumber(group.estimated), reportNumber(group.actual), reportNumber(group.difference, true),
            ]} />)}
            <View wrap={false} style={styles.total}>
              <Text>{report.totals.technicians} técnicos  |  {report.totals.orders} O/S distintas</Text>
              <Text>Estimadas: {reportNumber(report.totals.estimated)} h  |  Reales: {reportNumber(report.totals.actual)} h  |  Diferencia: {reportNumber(report.totals.difference, true)} h</Text>
            </View>
            <Text style={styles.note}>Diferencia = reales - estimadas. Un valor positivo indica más horas utilizadas; uno negativo indica menos horas. Una misma O/S puede aparecer para varios técnicos; el total general cuenta órdenes distintas.</Text>
            {reportHistoricalNotes(report).map((note) => <Text key={note} style={styles.note}>{note}</Text>)}
          </ReportPage>
          {report.groups.map((group) => (
            <ReportPage key={group.id} report={report} logo={logo} columns={DETAIL_COLUMNS} section={`Detalle · ${group.name}`}>
              {group.rows.map((row, index) => <Row key={row.id} columns={DETAIL_COLUMNS} alternate={index % 2 === 1} values={[
                row.order_code, row.par_number, row.client_name, reportDate(row.closed_at),
                `#${row.source_item_no} · ${row.product_code || "Sin código"}\n${row.description}`,
                reportNumber(row.hours), reportNumber(row.actual_hours), reportNumber(row.difference, true),
              ]} />)}
              <View wrap={false} style={styles.total}>
                <Text>{group.name} · {group.orderCount} O/S  |  Estimadas: {reportNumber(group.estimated)} h  |  Reales: {reportNumber(group.actual)} h  |  Diferencia: {reportNumber(group.difference, true)} h</Text>
              </View>
            </ReportPage>
          ))}
        </>
      )}
    </Document>
  );
}

export async function renderReportPdf(report) {
  // Activo local conocido: no solicitar URLs ni rutas recibidas del usuario.
  // El PNG evita depender de servicios externos o conversión WebP en producción.
  const logo = await readFile(path.join(process.cwd(), "public", "Logo.png"));
  return renderToBuffer(<ReportDocument report={report} logo={logo} />);
}
