import {
  Columns3,
  Files,
  LayoutDashboard,
  RefreshCw,
  Search,
  Settings,
  Upload,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Search", icon: Search },
  { href: "/files", label: "Files", icon: Files },
  { href: "/sync", label: "Sync", icon: RefreshCw },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/columns", label: "Columns", icon: Columns3 },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
