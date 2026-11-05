import { Link } from "@/i18n/routing";
import { Logo } from "./logo";
import { GlobalSearch } from "./global-search";
import { MoreMenu } from "./more-menu";
import { PrivacyPill } from "@/components/ui/privacy-pill";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 gc-glass border-x-0 border-t-0 pt-[env(safe-area-inset-top)]">
      <div className="container flex h-14 items-center gap-2">
        <Link href="/" aria-label="GreeCheck" className="gc-pressable shrink-0">
          <Logo size={32} withWordmark />
        </Link>
        <div className="flex-1" />
        <GlobalSearch />
        <PrivacyPill className="hidden lg:inline-flex" />
        <MoreMenu />
      </div>
    </header>
  );
}
