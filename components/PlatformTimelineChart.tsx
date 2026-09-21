"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SheetRow, fmtNumber, mesLabel, mesLabelCorto, unidadPeriodo } from "@/lib/types";
import {
  COLOR_A,
  COLOR_B,
  COLOR_ENTRE,
  COLOR_OTROS,
  OPACIDAD_OTROS,
  colorDePeriodo,
} from "@/components/MetricTrendChart";

/* ==========================================================================
   MODIFICAR AQUÍ (si quieres) — color de cada plataforma en la vista "Todas"
   Si aparece una plataforma nueva sin color, usa uno de la lista COLORES_EXTRA.
   ========================================================================== */
const COLOR_PLATAFORMA: Record<string, string> = {
  facebook: "#4c8dff",
  instagram: "#e1306c",
  tiktok: "#3fd6c6",
  whatsapp: "#4ade80",
};
const COLORES_EXTRA = ["#a78bfa", "#facc15", "#f472b6", "#94a3b8"];

const corto = (n: number) =>
  Math.abs(n) >= 1000
    ? `${(n / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}k`
    : n.toLocaleString("es-CO", { maximumFractionDigits: 3 });

// Evolución de una métrica (por defecto Visualizaciones) a lo largo de TODOS los periodos,
// con filtro por plataforma. Recibe las filas de Redes_LookerStudio ya agrupadas según la
// vista principal (mensual / trimestral / anual), así que reacciona a ese filtro.
export function PlatformTimelineChart({
  rows,
  metrica = "Visualizaciones",
  mesA,
  mesB,
}: {
  rows: SheetRow[];
  metrica?: string;
  mesA: string;
  mesB: string;
}) {
  const [seleccion, setSeleccion] = useState<string>("Todas");

  const { plataformas, filas } = useMemo(() => {
    const todas = [...new Set(rows.map((r) => String(r.Plataforma ?? "")))].filter(Boolean);
    // solo plataformas que tengan al menos un dato numérico
    const plataformas = todas.filter((pl) =>
      rows.some((r) => String(r.Plataforma) === pl && typeof r[metrica] === "number")
    );
    const periodos = [...new Set(rows.map((r) => String(r.Mes)))].sort();
    const filas = periodos.map((p) => {
      const fila: Record<string, string | number | null> = {
        periodo: p,
        corto: mesLabelCorto(p),
        largo: mesLabel(p),
      };
      for (const pl of plataformas) {
        const r = rows.find((x) => String(x.Mes) === p && String(x.Plataforma) === pl);
        const v = r?.[metrica];
        fila[pl] = typeof v === "number" ? v : null;
      }
      return fila;
    });
    return { plataformas, filas };
  }, [rows, metrica]);

  if (plataformas.length === 0 || filas.length === 0) return null;

  const activa = plataformas.includes(seleccion) ? seleccion : "Todas";
  const unidad = unidadPeriodo(mesA);

  const colorDe = (pl: string) => {
    const conocido = COLOR_PLATAFORMA[pl.toLowerCase()];
    if (conocido) return conocido;
    return COLORES_EXTRA[plataformas.indexOf(pl) % COLORES_EXTRA.length];
  };

  const cortoA = mesLabelCorto(mesA);
  const cortoB = mesLabelCorto(mesB);
  const hayEntre = filas.some((f) => colorDePeriodo(String(f.periodo), mesA, mesB).fill === COLOR_ENTRE);

  const chip = (nombre: string) => {
    const on = activa === nombre;
    return (
      <button
        key={nombre}
        type="button"
        aria-pressed={on}
        onClick={() => setSeleccion(nombre)}
        className={`rounded-full border px-3.5 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
          on
            ? "border-brand bg-brand text-asphalt-900"
            : "border-line text-paper/70 hover:border-brand hover:text-brand"
        }`}
      >
        {nombre}
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
      {/* Filtro por plataforma */}
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Filtrar por plataforma">
        <span className="mr-1 font-display text-xs uppercase tracking-wide text-paper/55">Plataforma</span>
        {chip("Todas")}
        {plataformas.map((pl) => chip(pl))}
      </div>

      {/* Leyenda */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-paper/60">
        {activa === "Todas" ? (
          <>
            {plataformas.map((pl) => (
              <span key={pl} className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colorDe(pl) }} />
                {pl}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm border border-brand/60 bg-brand/20" />
              Franja = periodos comparados ({mesLabel(mesA)} y {mesLabel(mesB)})
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_A }} />
              {mesLabel(mesA)}
            </span>
            {mesB !== mesA && (
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_B }} />
                {mesLabel(mesB)}
              </span>
            )}
            {hayEntre && (
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_ENTRE }} />
                Entre ambos
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <i
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: COLOR_OTROS, opacity: OPACIDAD_OTROS + 0.15 }}
              />
              Otros periodos
            </span>
          </>
        )}
      </div>

      <p className="mb-2 font-display text-sm uppercase tracking-wide text-paper/70">
        {metrica} · {activa === "Todas" ? "todas las plataformas" : activa} · por {unidad}
      </p>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ top: 20, right: 8, left: 0, bottom: 4 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
            <XAxis dataKey="corto" stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} interval={0} />
            <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickFormatter={(v) => fmtNumber(v)} width={56} />

            {/* Franjas sobre los dos periodos que se están comparando arriba */}
            <ReferenceArea x1={cortoA} x2={cortoA} fill={COLOR_A} fillOpacity={0.14} stroke="none" ifOverflow="visible" />
            {mesB !== mesA && (
              <ReferenceArea x1={cortoB} x2={cortoB} fill={COLOR_B} fillOpacity={0.14} stroke="none" ifOverflow="visible" />
            )}

            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.06)" }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.largo ?? ""}
              formatter={(v: number, name: string) => [v.toLocaleString("es-CO", { maximumFractionDigits: 3 }), name]}
              contentStyle={{ background: "#0d0d0d", border: "1px solid #3a3a3a", borderRadius: 10 }}
              labelStyle={{ color: "#f7f7f5", fontWeight: 600 }}
              itemStyle={activa === "Todas" ? undefined : { color: "#ffb23c" }}
            />

            {activa === "Todas" ? (
              plataformas.map((pl) => (
                <Bar key={pl} dataKey={pl} name={pl} fill={colorDe(pl)} radius={[4, 4, 0, 0]} maxBarSize={26} />
              ))
            ) : (
              <Bar dataKey={activa} name={activa} radius={[6, 6, 0, 0]} maxBarSize={56}>
                {filas.map((f) => {
                  const c = colorDePeriodo(String(f.periodo), mesA, mesB);
                  return <Cell key={String(f.periodo)} fill={c.fill} fillOpacity={c.opacity} />;
                })}
                <LabelList
                  dataKey={activa}
                  content={(p: any) =>
                    p.value == null ? null : (
                      <text x={Number(p.x) + Number(p.width) / 2} y={Number(p.y) - 6} textAnchor="middle" fill="#e5e5e5" fontSize={10}>
                        {corto(Number(p.value))}
                      </text>
                    )
                  }
                />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
