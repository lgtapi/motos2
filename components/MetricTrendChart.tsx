"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtNumber, mesLabel, mesLabelCorto } from "@/lib/types";

/* ==========================================================================
   MODIFICAR AQUÍ (si quieres) — colores de las barras
   ========================================================================== */
export const COLOR_A = "#ff5803"; // periodo A (izquierda de la flecha)
export const COLOR_B = "#ffb23c"; // periodo B (derecha de la flecha)
export const COLOR_ENTRE = "#ff8a3d"; // periodos que quedan entre A y B
export const COLOR_OTROS = "#ff5803"; // periodos fuera del rango (se ven atenuados)
export const OPACIDAD_OTROS = 0.5;

// Color de la barra de un periodo según el rango A → B que eligió el usuario
export function colorDePeriodo(periodo: string, mesA: string, mesB: string) {
  if (periodo === mesA) return { fill: COLOR_A, opacity: 1 };
  if (periodo === mesB) return { fill: COLOR_B, opacity: 1 };
  const [desde, hasta] = mesA < mesB ? [mesA, mesB] : [mesB, mesA];
  if (periodo > desde && periodo < hasta) return { fill: COLOR_ENTRE, opacity: 1 };
  return { fill: COLOR_OTROS, opacity: OPACIDAD_OTROS };
}

// Valor corto para poner encima de cada barra: 165400 -> "165,4k"
const corto = (n: number) =>
  Math.abs(n) >= 1000
    ? `${(n / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}k`
    : n.toLocaleString("es-CO", { maximumFractionDigits: 1 });

// Evolución de UNA métrica a lo largo de todos los periodos disponibles.
// Los periodos del rango A → B (el que se elige en la barra COMPARAR) se resaltan.
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
  const hayEntre = filas.some((f) => colorDePeriodo(f.periodo, mesA, mesB).fill === COLOR_ENTRE);

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

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-paper/60">
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
      </div>

      {filas.length === 0 ? (
        <p className="py-10 text-center text-sm text-paper/45">Sin datos para esta métrica.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filas} margin={{ top: 20, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
              <XAxis dataKey="corto" stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} interval={0} />
              <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickFormatter={(v) => fmtNumber(v)} width={56} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.06)" }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.largo ?? ""}
                formatter={(v: number) => [v.toLocaleString("es-CO", { maximumFractionDigits: 1 }), title]}
                contentStyle={{ background: "#0d0d0d", border: "1px solid #3a3a3a", borderRadius: 10 }}
                labelStyle={{ color: "#f7f7f5", fontWeight: 600 }}
                itemStyle={{ color: "#ffb23c" }}
              />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {filas.map((f) => {
                  const c = colorDePeriodo(f.periodo, mesA, mesB);
                  return <Cell key={f.periodo} fill={c.fill} fillOpacity={c.opacity} />;
                })}
                {/* Valor encima de cada barra: así también se ven los meses con valores muy bajos o en cero */}
                <LabelList
                  dataKey="valor"
                  content={(p: any) => (
                    <text x={Number(p.x) + Number(p.width) / 2} y={Number(p.y) - 6} textAnchor="middle" fill="#e5e5e5" fontSize={10}>
                      {corto(Number(p.value))}
                    </text>
                  )}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
