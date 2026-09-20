"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtNumber, mesLabel, mesLabelCorto } from "@/lib/types";

// Evolución de UNA métrica a lo largo de todos los periodos disponibles.
// Los periodos comparados arriba (A y B) se resaltan; el resto queda en gris.
// Como recibe los datos ya agrupados por la vista (mensual / trimestral / anual),
// cambia sola cuando el usuario cambia el filtro principal.
export function MetricTrendChart({
  title,
  unidad,
  data,
  mesA,
  mesB,
  onClose,
}: {
  title: string;
  unidad: "mes" | "trimestre" | "año";
  data: { periodo: string; valor: number }[];
  mesA: string;
  mesB: string;
  onClose?: () => void;
}) {
  const filas = data.map((d) => ({ ...d, corto: mesLabelCorto(d.periodo), largo: mesLabel(d.periodo) }));

  /* ==========================================================================
     MODIFICAR AQUÍ (si quieres) — colores de las barras
     ========================================================================== */
  const COLOR_A = "#ff5803"; // periodo A (izquierda de la flecha)
  const COLOR_B = "#ffb23c"; // periodo B (derecha de la flecha)
  const COLOR_OTROS = "#3f3f3f"; // los demás periodos
  const colorDe = (p: string) => (p === mesA ? COLOR_A : p === mesB ? COLOR_B : COLOR_OTROS);

  return (
    <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-display text-sm uppercase tracking-wide text-paper/70">
          {title} · por {unidad}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Ocultar gráfica de ${title}`}
            className="rounded-full px-2 text-lg leading-none text-paper/45 hover:text-paper print:hidden"
          >
            ×
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-paper/55">
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
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_OTROS }} />
          Otros periodos
        </span>
      </div>

      {filas.length === 0 ? (
        <p className="py-10 text-center text-sm text-paper/45">Sin datos para esta métrica.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filas} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
              <XAxis dataKey="corto" stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} interval="preserveStartEnd" />
              <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickFormatter={(v) => fmtNumber(v)} width={56} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.largo ?? ""}
                formatter={(v: number) => [v.toLocaleString("es-CO", { maximumFractionDigits: 1 }), title]}
                contentStyle={{
                  background: "#161616",
                  border: "1px solid #2c2c2c",
                  borderRadius: 10,
                  color: "#f7f7f5",
                }}
              />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {filas.map((f) => (
                  <Cell key={f.periodo} fill={colorDe(f.periodo)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
