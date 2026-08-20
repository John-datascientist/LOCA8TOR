import type { NavLink } from "@/lib/nav";

export const userNav: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/my-giveaways", label: "My giveaways" },
  { href: "/my-claims", label: "My claims" },
  { href: "/my-deliveries", label: "My deliveries" },
  { href: "/my-sponsorships", label: "My sponsorships" },
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Notifications" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export const businessNav: NavLink[] = [
  { href: "/business/dashboard", label: "Dashboard" },
  { href: "/business/give", label: "Give" },
  { href: "/business/campaigns", label: "Campaigns" },
  { href: "/business/deliveries", label: "Deliveries" },
  { href: "/business/impact", label: "Impact" },
];

export const riderNav: NavLink[] = [
  { href: "/rider/dashboard", label: "Dashboard" },
  { href: "/rider/deliveries", label: "Deliveries" },
  { href: "/rider/navigation", label: "Navigation" },
  { href: "/rider/earnings", label: "Earnings" },
  { href: "/rider/profile", label: "Profile" },
];

export const adminNav: NavLink[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/giveaways", label: "Giveaways" },
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/deliveries", label: "Deliveries" },
  { href: "/admin/riders", label: "Riders" },
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/sponsors", label: "Sponsors" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/live-map", label: "Live map" },
  { href: "/admin/settings", label: "Settings" },
];
