"use client";
// Lightweight SVG nutrition radar (sugar, salt, sat. fat, protein, fiber, additives, processing)
const AXES = ["Sucre", "Sel", "Gras sat.", "Protéines", "Fibres", "Additifs", "Transfo."];

export function NutritionRadar({
  values = [60, 40, 50, 70, 65, 30, 45],
  size = 260
}: {
  values?: number[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const n = AXES.length;
  const point = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = (r * v) / 100;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const poly = values.map((v, i) => point(i, v).join(",")).join(" ");
  const rings = [25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px]">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={AXES.map((_, i) => point(i, ring).join(",")).join(" ")}
          fill="none"
          stroke="rgb(var(--gc-line))"
          strokeWidth="1"
        />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(var(--gc-line))" strokeWidth="1" />;
      })}
      <polygon points={poly} fill="rgb(var(--gc-natural) / 0.18)" stroke="rgb(var(--gc-natural))" strokeWidth="2" />
      {AXES.map((label, i) => {
        const [x, y] = point(i, 122);
        return (
          <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-muted" fontSize="9">
            {label}
          </text>
        );
      })}
    </svg>
  );
}
