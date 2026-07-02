import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { SideNav } from "./side-nav";
import { ConsentBanner } from "@/components/ads/consent-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />
      <div className="container flex gap-6">
        <SideNav />
        <main className="min-w-0 flex-1 pb-28 pt-4 md:pb-10">{children}</main>
      </div>
      <BottomNav />
      <ConsentBanner />
    </div>
  );
}
