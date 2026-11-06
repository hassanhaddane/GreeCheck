import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { getTranslations } from "next-intl/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="sr-only fixed start-4 top-4 z-[100] rounded-xl bg-deep px-4 py-3 font-semibold text-white focus:not-sr-only">
        {t("skipToContent")}
      </a>
      <TopBar />
      <main id="main-content" tabIndex={-1} className="gc-container gc-main">{children}</main>
      <BottomNav />
    </div>
  );
}
