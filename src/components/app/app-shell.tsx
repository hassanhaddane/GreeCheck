import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { SideNav } from "./side-nav";
import { AppBackground } from "./app-background";
import { getTranslations } from "next-intl/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only fixed start-4 top-4 z-[100] rounded-xl bg-deep px-4 py-3 text-sm font-semibold text-white focus:not-sr-only"
      >
        {t("skipToContent")}
      </a>
      <AppBackground />
      <TopBar />
      <div className="container flex gap-6">
        <SideNav />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-32 pt-4 md:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
