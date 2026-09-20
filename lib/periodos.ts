import { useMemo } from "react";
import type { SheetRow } from "@/lib/types";

// ---------------------------------------------------------------------------
// Vistas del reporte: mensual (como estaba), trimestral y anual.
// Trimestres calendario: T1 = Ene–Mar, T2 = Abr–Jun, T3 = Jul–Sep, T4 = Oct–Dic.
//
// La idea: los datos siguen viniendo del Sheet MES A MES. Aquí se agrupan en
// trimestres/años y la columna de fecha pasa a valer "2026-T3" o "2026".
// Así el resto del dashboard (PlatformSection, gráficos, etc.) funciona igual.
// ---------------------------------------------------------------------------

export type Vista = "mensual" | "trimestral" | "anual";
export type Regla = "suma" | "promedio" | "ultimo";

/* ==========================================================================
   MODIFICAR AQUÍ (si lo necesitas) — cómo se combinan los meses de un periodo
   - "suma":     visualizaciones, interacciones, gasto, clics, sesiones…
   - "promedio": alcance y usuarios (son cuentas únicas: sumarlos las repite),
                 y también tasas/costos (CTR, CPC, rebote, costo por resultado).
   - "ultimo":   valores acumulados, como "Total usuarios" (se queda el del
                 último mes del periodo).
   Cualquier columna que no coincida con estas reglas se SUMA.
   ========================================================================== */
export function reglaDeAgregacion(columna: string): Regla {
  const k = columna.toLowerCase();
  if (k === "total usuarios") return "ultimo";
  if (
    k.includes("alcance") ||
    k === "usuarios" ||
    k.includes("promedio") ||
    k.includes("tasa") ||
    k.includes("costo") ||
    k === "ctr" ||
    k === "cpc"
  ) {
    return "promedio";
  }
  return "suma";
}

// "2026-08-01" -> "2026-08-01" (mensual) | "2026-T3" (trimestral) | "2026" (anual)
export function periodoDe(iso: string, vista: Vista): string {
  if (vista === "mensual") return iso;
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return vista === "anual" ? String(y) : `${y}-T${Math.ceil(m / 3)}`;
}

// Para pestañas con UNA FILA POR MES (y por plataforma, asesor, canal, etc.):
// junta los meses de cada periodo en una sola fila.
// `groupBy` = columnas de texto que identifican cada fila además de la fecha.
export function agruparPorPeriodo(
  rows: SheetRow[],
  dateField: string,
  vista: Vista,
  groupBy: string[] = ["Plataforma"]
): SheetRow[] {
  if (vista === "mensual") return rows;

  const grupos = new Map<string, SheetRow[]>();
  for (const r of rows) {
    const fecha = r[dateField];
    if (typeof fecha !== "string") continue;
    const id = [periodoDe(fecha, vista), ...groupBy.map((g) => String(r[g] ?? ""))].join("||");
    const lista = grupos.get(id) ?? [];
    lista.push(r);
    grupos.set(id, lista);
  }

  const salida: SheetRow[] = [];
  for (const filas of grupos.values()) {
    filas.sort((a, b) => (String(a[dateField]) < String(b[dateField]) ? -1 : 1));
    const fila: SheetRow = { ...filas[0] };
    fila[dateField] = periodoDe(String(filas[0][dateField]), vista);

    for (const key of Object.keys(fila)) {
      if (key === dateField || groupBy.includes(key)) continue;
      if (key.includes("Var")) { fila[key] = null; continue; } // el dashboard recalcula las variaciones
      const nums = filas.map((f) => f[key]).filter((v): v is number => typeof v === "number");
      if (nums.length === 0) continue; // conserva texto como "Pendiente"
      const total = nums.reduce((s, n) => s + n, 0);
      const regla = reglaDeAgregacion(key);
      fila[key] = regla === "suma" ? total : regla === "promedio" ? total / nums.length : nums[nums.length - 1];
    }
    salida.push(fila);
  }
  return salida;
}

// Para pestañas de REGISTROS INDIVIDUALES (ej. Leads_Detalle): no se suma nada,
// solo se cambia el mes por el periodo y compareCountsByField cuenta las filas.
export function remapearFechas(rows: SheetRow[], dateField: string, vista: Vista): SheetRow[] {
  if (vista === "mensual") return rows;
  return rows.map((r) =>
    typeof r[dateField] === "string" ? { ...r, [dateField]: periodoDe(r[dateField] as string, vista) } : r
  );
}

// Avisa cuando un trimestre/año no tiene todos sus meses cargados
// (comparar T3 completo contra T4 con 1 solo mes sería engañoso).
export function coberturaPeriodos(
  rows: SheetRow[] | null,
  dateField: string,
  vista: Vista
): Record<string, string> {
  if (!rows || vista === "mensual") return {};
  const esperado = vista === "trimestral" ? 3 : 12;
  const meses = new Map<string, Set<string>>();
  for (const r of rows) {
    const f = r[dateField];
    if (typeof f !== "string") continue;
    const p = periodoDe(f, vista);
    const set = meses.get(p) ?? new Set<string>();
    set.add(f.slice(0, 7));
    meses.set(p, set);
  }
  const notas: Record<string, string> = {};
  meses.forEach((set, p) => {
    if (set.size < esperado) notas[p] = `${set.size} de ${esperado} meses`;
  });
  return notas;
}

// Hook: recalcula solo cuando cambian los datos o la vista.
export function usePeriodo(
  rows: SheetRow[] | null,
  dateField: string,
  vista: Vista,
  groupBy: string[] = ["Plataforma"],
  registros = false
): SheetRow[] | null {
  const groupKey = groupBy.join("|");
  return useMemo(() => {
    if (!rows) return null;
    return registros
      ? remapearFechas(rows, dateField, vista)
      : agruparPorPeriodo(rows, dateField, vista, groupBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, dateField, vista, groupKey, registros]);
}
