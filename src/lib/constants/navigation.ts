import {
  ScanLine, Search, Swords, ShoppingBasket, History, Heart, ListChecks,
  SlidersHorizontal, BookOpenText, Settings, ShieldCheck, HeartHandshake, type LucideIcon
} from "lucide-react";

export interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  primary?: boolean;
}

/**
 * Primary navigation — exactly the five V2 destinations
 * (Scan is the central primary action on mobile).
 */
export const BOTTOM_NAV: NavItem[] = [
  { key: "search", href: "/search", icon: Search },
  { key: "history", href: "/history", icon: History },
  { key: "scan", href: "/scan", icon: ScanLine, primary: true },
  { key: "battle", href: "/compare", icon: Swords },
  { key: "cart", href: "/cart", icon: ShoppingBasket }
];

/** Secondary destinations — the compact "More" menu (mobile sheet + desktop rail footer). */
export const MORE_NAV: NavItem[] = [
  { key: "favorites", href: "/favorites", icon: Heart },
  { key: "list", href: "/list", icon: ListChecks },
  { key: "criteria", href: "/criteria", icon: SlidersHorizontal },
  { key: "methodology", href: "/methodology", icon: BookOpenText },
  { key: "settings", href: "/settings", icon: Settings },
  { key: "privacy", href: "/privacy", icon: ShieldCheck },
  { key: "support", href: "/support", icon: HeartHandshake }
];
