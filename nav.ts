export type NavLink = {
  href: string;
  label: string;
};

export const primaryNav: NavLink[] = [
  { href: "/give", label: "Give" },
  { href: "/browse", label: "Browse" },
  { href: "/business", label: "Business" },
  { href: "/sponsor", label: "Sponsor" },
  { href: "/how-it-works", label: "How it works" },
];

export const footerNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Platform",
    links: [
      { href: "/about", label: "About WeGive" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/safety", label: "Safety" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Give & get",
    links: [
      { href: "/give", label: "Give something away" },
      { href: "/browse", label: "Browse giveaways" },
      { href: "/sponsor", label: "Sponsor a delivery" },
    ],
  },
  {
    heading: "Business",
    links: [
      { href: "/business", label: "Corporate giving" },
      { href: "/business/dashboard", label: "Business dashboard" },
      { href: "/become-a-rider", label: "Become a rider" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];
