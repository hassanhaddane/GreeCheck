import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { SideNav } from "./side-nav";
import { AppBackground } from "./app-background";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppBackground />
      <TopBar />
      <div className="container flex gap-6">
        <SideNav />
        <main className="min-w-0 flex-1 pb-32 pt-4 md:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
