import { Home, ScanLine, Search, Swords, ShoppingBasket, MapPin, ListChecks, type LucideIcon } from "lucide-react";

export interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  primary?: boolean;
}

// Mobile bottom bar — scan is the central primary action.
export const BOTTOM_NAV: NavItem[] = [
  { key: "home", href: "/", icon: Home },
  { key: "search", href: "/search", icon: Search },
  { key: "scan", href: "/scan", icon: ScanLine, primary: true },
  { key: "battle", href: "/battle", icon: Swords },
  { key: "basket", href: "/basket", icon: ShoppingBasket }
];

export const SECONDARY_NAV: NavItem[] = [
  { key: "list", href: "/list", icon: ListChecks },
  { key: "map", href: "/map", icon: MapPin }
];
