/**
 * Ambient premium background — fixed layers behind the whole app:
 * soft green halos and a faint grid fading from the top. The ambient
 * treatment is deliberately static so decoration never spends motion budget.
 */
export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 gc-bg-halos" />
      <div className="absolute inset-x-0 top-0 h-[42rem] gc-bg-grid" />
    </div>
  );
}
