// Lee una pestaña de un Google Sheet público (compartido como "Cualquiera con el
// enlace · Lector") usando el endpoint de Google Visualization API. No requiere
// API key ni OAuth: basta con el ID de la hoja de cálculo.
//
// Se usa el formato JSON (no CSV) porque las fechas vienen codificadas de forma
// explícita como Date(año, mesIndex, día), sin depender del locale del CSV.

export type SheetRow = Record<string, string | number | null>;

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function gvizUrl(tab: string) {
  if (!SHEET_ID) {
    throw new Error(
      "Falta la variable de entorno GOOGLE_SHEET_ID. Copia .env.local.example a .env.local y pega el ID de tu Google Sheet."
    );
  }
  const encodedTab = encodeURIComponent(tab);
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodedTab}`;
}

// Convierte celdas tipo Date(2026,4,1) -> "2026-05-01" (ISO, mes 1-indexado)
function parseGvizDate(raw: string): string {
  const match = /^Date\((\d+),(\d+),(\d+)/.exec(raw);
  if (!match) return raw;
  const [, y, mZeroIndexed, d] = match;
  const month = String(Number(mZeroIndexed) + 1).padStart(2, "0");
  const day = String(Number(d)).padStart(2, "0");
  return `${y}-${month}-${day}`;
}

function extractCellValue(cell: { v: unknown; f?: string } | null): string | number | null {
  if (cell === null || cell === undefined) return null;
  const v = cell.v;
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.startsWith("Date(")) {
    return parseGvizDate(v);
  }
  if (typeof v === "number" || typeof v === "string") return v;
  return cell.f ?? null;
}

/* ==========================================================================
   MODIFICAR AQUÍ (si lo necesitas) — corrección automática de miles mal cargados

   Problema: al escribir "262.831" en un Sheets cuyo idioma usa el punto como
   decimal, el valor queda guardado como 262,831 (menos de mil) en vez de 262831.
   Las métricas de CONTEO (visualizaciones, alcance, clics…) no pueden tener
   decimales, así que un conteo con decimales y menor a 1.000 se multiplica por 1000.

   - Para apagar la corrección: pon CORREGIR_MILES = false
   - Para agregar una métrica de conteo nueva: añade parte de su nombre a la lista
   - No afecta a CTR, CPC, costos, tasas, promedios ni a las columnas de variación (%)
   ========================================================================== */
export const CORREGIR_MILES = true;

const COLUMNAS_DE_CONTEO = [
  "visualiz", "alcance", "interac", "clic", "visita", "seguidor", "impresion",
  "sesion", "usuario", "pagina", "página", "mensaje", "conversacion",
  "conversación", "publicacion", "publicación", "historia", "conversion",
  "conversión", "reproduc",
];

function esColumnaDeConteo(columna: string): boolean {
  const c = columna.toLowerCase();
  if (c.includes("var") || c.includes("tasa") || c.includes("promedio")) return false;
  return COLUMNAS_DE_CONTEO.some((k) => c.includes(k));
}

export function corregirMiles(rows: SheetRow[], tab = ""): SheetRow[] {
  if (!CORREGIR_MILES) return rows;
  const cambios: string[] = [];
  const corregidas = rows.map((r) => {
    const fila: SheetRow = { ...r };
    for (const [col, v] of Object.entries(fila)) {
      if (typeof v === "number" && esColumnaDeConteo(col) && !Number.isInteger(v) && Math.abs(v) < 1000) {
        fila[col] = Math.round(v * 1000);
        cambios.push(`${col}: ${v} -> ${fila[col]}`);
      }
    }
    return fila;
  });
  if (cambios.length) {
    console.warn(`[${tab}] ${cambios.length} valor(es) con formato de miles corregidos:`, cambios.slice(0, 20));
  }
  return corregidas;
}

export async function fetchSheetTab(tab: string): Promise<SheetRow[]> {
  const url = gvizUrl(tab);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`No se pudo leer la pestaña "${tab}" (HTTP ${res.status}). Revisa que exista y que la hoja esté compartida como "Cualquiera con el enlace".`);
  }
  const text = await res.text();

  // La respuesta viene envuelta en: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const jsonMatch = /setResponse\(([\s\S]*)\);?\s*$/.exec(text.trim());
  if (!jsonMatch) {
    throw new Error(`Respuesta inesperada de Google Sheets para la pestaña "${tab}". Verifica el GOOGLE_SHEET_ID y que la hoja sea pública para lectores.`);
  }
  const data = JSON.parse(jsonMatch[1]);

  if (data.status === "error") {
    const msg = data.errors?.[0]?.detailed_message || "Error desconocido de Google Sheets";
    throw new Error(`Google Sheets devolvió un error para "${tab}": ${msg}`);
  }

  const cols: string[] = data.table.cols.map(
    (c: { label?: string; id: string }, i: number) => c.label || c.id || `col_${i}`
  );

  const rows: SheetRow[] = (data.table.rows || []).map((r: { c: ({ v: unknown; f?: string } | null)[] }) => {
    const obj: SheetRow = {};
    cols.forEach((colName, i) => {
      obj[colName] = extractCellValue(r.c[i]);
    });
    return obj;
  });

  return corregirMiles(rows, tab);
}
