export type NearbyGiveaway = {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  location: string;
  /** State / region the item is in, used to scope Nigeria browsing to one state. */
  state: string;
  /** Country the item is in. All current demo listings are Nigeria only. */
  country: "NG";
  distanceKm: number;
  condition: string;
  emoji: string;
  freeDelivery?: boolean;
};

export const nearbyGiveaways: NearbyGiveaway[] = [
  {
    id: "sofa-1",
    title: "3-seater fabric sofa",
    category: "Furniture",
    subcategory: "Living room",
    location: "Ikeja, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 2.1,
    condition: "Good condition",
    emoji: "🛋️",
    freeDelivery: true,
  },
  {
    id: "laptop-1",
    title: "Dell laptop, working",
    category: "Electronics",
    subcategory: "Computers",
    location: "Yaba, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 3.6,
    condition: "Fully working",
    emoji: "💻",
  },
  {
    id: "phone-1",
    title: "iPhone 12, cracked screen",
    category: "Electronics",
    subcategory: "Phones",
    location: "Lekki, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 6.4,
    condition: "Working, screen cracked",
    emoji: "📱",
  },
  {
    id: "rice-1",
    title: "Bag of rice, 10kg",
    category: "Food",
    subcategory: "Food items",
    location: "Surulere, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 4.2,
    condition: "Packaged, unopened",
    emoji: "🍚",
  },
  {
    id: "jollof-1",
    title: "Jollof rice & chicken, serves 4",
    category: "Food",
    subcategory: "Cooked food",
    location: "Ikeja, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 1.8,
    condition: "Made today, still warm",
    emoji: "🍛",
    freeDelivery: true,
  },
  {
    id: "clothes-1",
    title: "Children's clothing bundle",
    category: "Clothing",
    subcategory: "Children",
    location: "Gbagada, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 5.0,
    condition: "Good condition",
    emoji: "👕",
  },
  {
    id: "suit-1",
    title: "Men's suit, size 40R",
    category: "Clothing",
    subcategory: "Men",
    location: "Victoria Island, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 7.2,
    condition: "Worn twice, dry cleaned",
    emoji: "🧥",
  },
  {
    id: "dress-1",
    title: "Women's ankara dresses (x3)",
    category: "Clothing",
    subcategory: "Women",
    location: "Yaba, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 3.1,
    condition: "Good condition",
    emoji: "👗",
  },
  {
    id: "cookware-1",
    title: "Non-stick cookware set (8 pieces)",
    category: "Household",
    subcategory: "Kitchen utensils",
    location: "Ikeja, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 2.6,
    condition: "Good condition, few scratches",
    emoji: "🍳",
  },
  {
    id: "storage-1",
    title: "Stackable storage bins (x5)",
    category: "Household",
    subcategory: "Storage & organization",
    location: "Surulere, Lagos",
    state: "Lagos",
    country: "NG",
    distanceKm: 4.8,
    condition: "Like new",
    emoji: "🗄️",
    freeDelivery: true,
  },
  {
    id: "blender-1",
    title: "Electric blender, 2 speed",
    category: "Household",
    subcategory: "Kitchen utensils",
    location: "Wuse, Abuja",
    state: "FCT",
    country: "NG",
    distanceKm: 3.4,
    condition: "Good condition",
    emoji: "🧃",
  },
];

// Mirrors the BASE_FEE / PER_KM_RATE shown in Admin > Payments. The real
// number always comes from the server-side pricing engine, this just
// estimates it client-side for display before a claim exists.
export function estimateDeliveryFee(distanceKm: number): number {
  const BASE_FEE = 1500;
  const PER_KM_RATE = 230;
  return Math.round(BASE_FEE + distanceKm * PER_KM_RATE);
}

export type OpenSponsorship = {
  id: string;
  itemTitle: string;
  recipientArea: string;
  totalFee: number;
  fundedAmount: number;
};

// All demo sponsorships are Nigeria-only for now, same as nearbyGiveaways.
export const openSponsorships: OpenSponsorship[] = [
  {
    id: "spon-1",
    itemTitle: "School supplies bundle",
    recipientArea: "Agege, Lagos",
    totalFee: 4225,
    fundedAmount: 2225,
  },
  {
    id: "spon-2",
    itemTitle: "Baby essentials pack",
    recipientArea: "Ajah, Lagos",
    totalFee: 3800,
    fundedAmount: 1500,
  },
  {
    id: "spon-3",
    itemTitle: "Wheelchair, lightly used",
    recipientArea: "Ikorodu, Lagos",
    totalFee: 5600,
    fundedAmount: 5600,
  },
];

// ---- Payments & escrow ----

export type PaymentMethod = "Card" | "Bank transfer";

export type EscrowTransaction = {
  id: string;
  itemTitle: string;
  payer: string;
  payerType: "Recipient" | "Sponsor";
  method: PaymentMethod;
  amount: number;
  status: "Held in escrow" | "Released to rider" | "Refunded";
  date: string;
};

export const escrowTransactions: EscrowTransaction[] = [
  { id: "tx-1", itemTitle: "School supplies bundle", payer: "Amaka Johnson", payerType: "Sponsor", method: "Card", amount: 2225, status: "Held in escrow", date: "Today" },
  { id: "tx-2", itemTitle: "Dell laptop, working", payer: "Tunde Bakare", payerType: "Recipient", method: "Bank transfer", amount: 4225, status: "Held in escrow", date: "Today" },
  { id: "tx-3", itemTitle: "Baby essentials pack", payer: "Grace Nwosu", payerType: "Sponsor", method: "Card", amount: 1500, status: "Held in escrow", date: "Yesterday" },
  { id: "tx-4", itemTitle: "Wheelchair, lightly used", payer: "Chidi Okafor", payerType: "Sponsor", method: "Bank transfer", amount: 5600, status: "Released to rider", date: "3 days ago" },
  { id: "tx-5", itemTitle: "Children's clothing bundle", payer: "Blessing Eze", payerType: "Recipient", method: "Card", amount: 3120, status: "Released to rider", date: "4 days ago" },
  { id: "tx-6", itemTitle: "Office chairs (x12)", payer: "Kingsley Corp.", payerType: "Recipient", method: "Bank transfer", amount: 18500, status: "Refunded", date: "1 week ago" },
];

export const escrowWalletBalance = escrowTransactions
  .filter((t) => t.status === "Held in escrow")
  .reduce((sum, t) => sum + t.amount, 0);

// ---- Current user (demo persona) ----

export const currentUser = {
  fullName: "Ngozi Umeh",
  email: "ngozi.umeh@example.com",
  phone: "+234 803 555 0148",
  postcode: "LA-104-772",
};

/**
 * Reciprocity gate: after a recipient's first claim, they must list a
 * giveaway of their own before claiming again.
 *
 * There is no real backend yet for giveaways/claims (that's a separate,
 * larger migration), so every real account starts at zero rather than
 * inheriting the old demo persona's history.
 */
export const currentUserStanding = {
  claimsMade: 0,
  givesMade: 0,
};

export function canClaimMore(): boolean {
  return currentUserStanding.claimsMade === 0 || currentUserStanding.givesMade > 0;
}

// ---- User portal ----
// Empty until giveaways/claims/deliveries are backed by real database tables.

export type MyGiveaway = {
  id: string;
  title: string;
  category: string;
  status: string;
  claims: number;
  updated: string;
  freeDelivery?: boolean;
  /** Set once a claim exists and the distance-based fee has been calculated. */
  deliveryFeeDue?: number;
};

export const myGiveaways: MyGiveaway[] = [];

export type MyClaim = {
  id: string;
  itemTitle: string;
  giverArea: string;
  status: string;
  detail: string;
};

export const myClaims: MyClaim[] = [];

export type MyDelivery = {
  id: string;
  itemTitle: string;
  status: string;
  stage: string;
};

export const myDeliveries: MyDelivery[] = [];

export type NotificationItem = {
  id: string;
  category: "Giveaway" | "Delivery" | "Sponsorship" | "New listing";
  message: string;
  timeAgo: string;
  read: boolean;
  channels?: ("In-app" | "Email")[];
};

export const notifications: NotificationItem[] = [
  { id: "n-1", category: "Delivery", message: "Your rider is approaching the pickup for \"Dell laptop, working\".", timeAgo: "10 min ago", read: false },
  { id: "n-5", category: "New listing", message: "New near you: \"Men's suit, size 40R\" just posted in Clothing, Victoria Island.", timeAgo: "35 min ago", read: false, channels: ["In-app", "Email"] },
  { id: "n-6", category: "New listing", message: "New near you: \"Jollof rice & chicken, serves 4\" just posted in Food, Ikeja.", timeAgo: "2 hours ago", read: true, channels: ["In-app", "Email"] },
  { id: "n-2", category: "Giveaway", message: "Someone claimed your \"Toddler winter coats (x3)\" listing.", timeAgo: "5 hours ago", read: false },
  { id: "n-3", category: "Sponsorship", message: "Your delivery to Agege, Lagos is now fully funded.", timeAgo: "1 day ago", read: true },
  { id: "n-4", category: "Giveaway", message: "Your listing \"3-seater fabric sofa\" was approved.", timeAgo: "2 days ago", read: true },
];

export type Conversation = {
  id: string;
  withName: string;
  role: "Giver" | "Recipient" | "Rider";
  lastMessage: string;
  timeAgo: string;
  unread: boolean;
};

export const conversations: Conversation[] = [
  { id: "conv-1", withName: "Tunde A.", role: "Giver", lastMessage: "You can pick it up anytime after 4pm.", timeAgo: "9 min ago", unread: true },
  { id: "conv-2", withName: "Rider: Chidi O.", role: "Rider", lastMessage: "On my way, about 12 minutes out.", timeAgo: "20 min ago", unread: true },
  { id: "conv-3", withName: "Blessing E.", role: "Recipient", lastMessage: "Thank you so much, item was in great shape!", timeAgo: "4 days ago", unread: false },
];

// ---- Business portal ----

export type Campaign = {
  id: string;
  name: string;
  eligibility: string;
  itemsListed: number;
  status: string;
};

export const campaigns: Campaign[] = [
  { id: "camp-1", name: "School supplies for students", eligibility: "Verified students", itemsListed: 42, status: "Active" },
  { id: "camp-2", name: "Food assistance drive", eligibility: "Verified families", itemsListed: 18, status: "Active" },
  { id: "camp-3", name: "Back-to-work office surplus", eligibility: "Open to all", itemsListed: 65, status: "Completed" },
];

export type BusinessDelivery = {
  id: string;
  itemTitle: string;
  recipientArea: string;
  status: string;
};

export const businessDeliveries: BusinessDelivery[] = [
  { id: "bd-1", itemTitle: "School supplies bundle", recipientArea: "Agege, Lagos", status: "In transit" },
  { id: "bd-2", itemTitle: "Office chairs (x12)", recipientArea: "Yaba, Lagos", status: "Delivered" },
  { id: "bd-3", itemTitle: "Food assistance pack", recipientArea: "Mushin, Lagos", status: "Awaiting pickup" },
];

// ---- Rider portal ----

export type RiderDelivery = {
  id: string;
  itemTitle: string;
  pickupArea: string;
  dropoffArea: string;
  fee: number;
  status: string;
};

export const riderDeliveries: RiderDelivery[] = [
  { id: "rd-1", itemTitle: "Dell laptop, working", pickupArea: "Yaba, Lagos", dropoffArea: "Surulere, Lagos", fee: 1800, status: "Assigned" },
  { id: "rd-2", itemTitle: "Bag of rice, 10kg", pickupArea: "Surulere, Lagos", dropoffArea: "Mushin, Lagos", fee: 1200, status: "In progress" },
  { id: "rd-3", itemTitle: "Children's clothing bundle", pickupArea: "Gbagada, Lagos", dropoffArea: "Ikeja, Lagos", fee: 1500, status: "Completed" },
];

// ---- Admin portal ----

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "Recipient" | "Giver" | "Business" | "Rider";
  joined: string;
  status: "Active" | "Restricted";
};

export const adminUsers: AdminUser[] = [
  { id: "u-1", name: "Ada Lovelace", email: "ada@example.com", role: "Giver", joined: "Jan 2026", status: "Active" },
  { id: "u-2", name: "Tunde Adebayo", email: "tunde@example.com", role: "Recipient", joined: "Feb 2026", status: "Active" },
  { id: "u-3", name: "Blessing Eze", email: "blessing@example.com", role: "Recipient", joined: "Mar 2026", status: "Restricted" },
  { id: "u-4", name: "Chidi Okafor", email: "chidi@example.com", role: "Rider", joined: "Mar 2026", status: "Active" },
];

export type AdminGiveawayReview = {
  id: string;
  title: string;
  giver: string;
  category: string;
  submitted: string;
};

export const adminGiveawayQueue: AdminGiveawayReview[] = [
  { id: "ag-1", title: "Microwave oven", giver: "Ada Lovelace", category: "Electronics", submitted: "Just now" },
  { id: "ag-2", title: "Baby stroller", giver: "Funmi Bello", category: "Furniture", submitted: "3 hours ago" },
  { id: "ag-3", title: "Canned goods bundle", giver: "Kingsley Corp.", category: "Food", submitted: "1 day ago" },
];

export type AdminClaim = {
  id: string;
  itemTitle: string;
  claimant: string;
  status: string;
};

export const adminClaims: AdminClaim[] = [
  { id: "ac-1", itemTitle: "Dell laptop, working", claimant: "Tunde Adebayo", status: "Reserved" },
  { id: "ac-2", itemTitle: "Bag of rice, 10kg", claimant: "Blessing Eze", status: "Awaiting giver approval" },
  { id: "ac-3", itemTitle: "3-seater fabric sofa", claimant: "Funmi Bello", status: "Expired, returned to Available" },
];

export type AdminDelivery = {
  id: string;
  itemTitle: string;
  rider: string;
  status: string;
};

export const adminDeliveries: AdminDelivery[] = [
  { id: "ad-1", itemTitle: "School supplies bundle", rider: "Chidi Okafor", status: "In transit" },
  { id: "ad-2", itemTitle: "Office chairs (x12)", rider: "Femi Alabi", status: "Delivered" },
  { id: "ad-3", itemTitle: "Baby essentials pack", rider: "Unassigned", status: "Awaiting rider" },
];

export type AdminRider = {
  id: string;
  name: string;
  vehicle: string;
  verification: "Verified" | "Pending" | "Rejected";
};

export const adminRiders: AdminRider[] = [
  { id: "r-1", name: "Chidi Okafor", vehicle: "Motorcycle", verification: "Verified" },
  { id: "r-2", name: "Femi Alabi", vehicle: "Van", verification: "Verified" },
  { id: "r-3", name: "Grace Nwosu", vehicle: "Motorcycle", verification: "Pending" },
];

export type AdminBusiness = {
  id: string;
  name: string;
  status: "Verified" | "Pending review";
  submitted: string;
};

export const adminBusinesses: AdminBusiness[] = [
  { id: "b-1", name: "Kingsley Corp.", status: "Verified", submitted: "Jan 2026" },
  { id: "b-2", name: "Lagos Foodbank Ltd", status: "Pending review", submitted: "2 days ago" },
];

export type AdminReport = {
  id: string;
  subject: string;
  reporter: string;
  status: "Open" | "Resolved";
};

export const adminReports: AdminReport[] = [
  { id: "rep-1", subject: "Listing photos don't match item", reporter: "Blessing Eze", status: "Open" },
  { id: "rep-2", subject: "Rider was late without notice", reporter: "Tunde Adebayo", status: "Resolved" },
];
