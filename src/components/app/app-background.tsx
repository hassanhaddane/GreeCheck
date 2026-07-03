/**
 * Ambient premium background — fixed layers behind the whole app:
 * soft green halos, two slowly drifting organic orbs and a faint grid
 * fading from the top. Pure CSS animations (GPU-friendly, respects
 * prefers-reduced-motion via globals.css).
 */
export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 gc-bg-halos" />
      <div
        className="gc-orb gc-orb-a -top-32 h-96 w-96 ltr:-right-24 rtl:-left-24"
        style={{ background: "radial-gradient(circle at 30% 30%, rgb(var(--gc-neon) / 0.16), transparent 70%)" }}
      />
      <div
        className="gc-orb gc-orb-b top-[38%] h-[28rem] w-[28rem] ltr:-left-40 rtl:-right-40"
        style={{ background: "radial-gradient(circle at 70% 40%, rgb(var(--gc-natural) / 0.13), transparent 70%)" }}
      />
      <div className="absolute inset-x-0 top-0 h-[42rem] gc-bg-grid" />
    </div>
  );
}
