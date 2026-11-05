import { Link } from "@/i18n/routing";
import { Logo } from "./logo";
import { GlobalSearch } from "./global-search";
import { MoreMenu } from "./more-menu";
import { PrimaryNav } from "./bottom-nav";

export function TopBar() {
  return (
    <header className="gc-header sticky top-0 z-40 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
      <div className="gc-container grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 md:gap-3">
        <Link href="/" aria-label="GreeCheck" className="flex min-h-11 shrink-0 items-center">
          <Logo size={29} withWordmark />
        </Link>
        <PrimaryNav />
        <div className="col-start-3 flex items-center gap-2 justify-self-end">
          <GlobalSearch />
          <MoreMenu />
        </div>
      </div>
    </header>
  );
}
