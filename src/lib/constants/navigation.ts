import {
  ScanLine, Search, GitCompareArrows, ShoppingBasket, Library, ListChecks, MapPin,
  SlidersHorizontal, BookOpenText, Settings, ShieldCheck, HeartHandshake, type LucideIcon
} from "lucide-react";

export interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  primary?: boolean;
}

/** Shared by the mobile dock and desktop rail. Scan sits at the center on mobile. */
export const PRIMARY_NAV: NavItem[] = [
  { key: "search", href: "/search", icon: Search },
  { key: "scan", href: "/scan", icon: ScanLine, primary: true },
  { key: "products", href: "/products", icon: Library }
];

/** Secondary destinations are reached through the same menu on all viewports. */
export const MORE_NAV: NavItem[] = [
  { key: "battle", href: "/compare", icon: GitCompareArrows },
  { key: "cart", href: "/cart", icon: ShoppingBasket },
  { key: "list", href: "/list", icon: ListChecks },
  { key: "discover", href: "/discover", icon: MapPin },
  { key: "criteria", href: "/criteria", icon: SlidersHorizontal },
  { key: "methodology", href: "/methodology", icon: BookOpenText },
  { key: "settings", href: "/settings", icon: Settings },
  { key: "privacy", href: "/privacy", icon: ShieldCheck },
  { key: "support", href: "/support", icon: HeartHandshake }
];
