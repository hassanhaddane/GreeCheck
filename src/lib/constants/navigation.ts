import {
  ScanLine, Search, Swords, ShoppingBasket, History,
  Compass, SlidersHorizontal, BookOpenText, type LucideIcon
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
  { key: "battle", href: "/battle", icon: Swords },
  { key: "cart", href: "/cart", icon: ShoppingBasket }
];

/** Secondary destinations (desktop side rail + menus). */
export const SECONDARY_NAV: NavItem[] = [
  { key: "discover", href: "/discover", icon: Compass },
  { key: "criteria", href: "/criteria", icon: SlidersHorizontal },
  { key: "methodology", href: "/methodology", icon: BookOpenText }
];
