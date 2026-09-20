export type Role = "CUSTOMER" | "ORGANIZER" | "ADMIN";
export type EventStatus = "UPCOMING" | "LIVE" | "EXPIRED" | "CANCELLED";
export type TicketStatus = "PENDING" | "PAID" | "USED" | "CANCELLED" | "REFUNDED";
export type EventCategory =
  | "MUSIC"
  | "BUSINESS"
  | "SPORTS"
  | "CAMPUS"
  | "ARTS"
  | "TECHNOLOGY"
  | "FOOD"
  | "OTHER";

export interface UserPublic {
  id: string;
  name: string | null;
  phone: string;
  email?: string | null;
  role: Role;
  avatarUrl?: string | null;
  isVerified: boolean;
  isKycVerified: boolean;
  businessName?: string | null;
}

export interface EventCard {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  location: string;
  city: string;
  venue?: string | null;
  category: EventCategory;
  status: EventStatus;
  startDate: string;
  endDate: string;
  ticketPrice: number;
  currency: string;
  totalTickets: number;
  soldTickets: number;
  isFeatured: boolean;
  organizer: {
    id: string;
    name: string | null;
    businessName?: string | null;
    avatarUrl?: string | null;
  };
}

export interface TicketView {
  id: string;
  ticketCode: string;
  qrData: string;
  status: TicketStatus;
  pricePaid: number;
  currency: string;
  scannedAt?: string | null;
  createdAt: string;
  event: {
    id: string;
    title: string;
    slug: string;
    startDate: string;
    endDate: string;
    venue?: string | null;
    location: string;
    city: string;
    coverImageUrl?: string | null;
  };
}

export const CITIES = [
  "Dar es Salaam",
  "Arusha",
  "Mwanza",
  "Dodoma",
  "Mbeya",
  "Zanzibar",
  "Moshi",
  "Tanga",
] as const;

export const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: "MUSIC", label: "Music" },
  { value: "BUSINESS", label: "Business" },
  { value: "SPORTS", label: "Sports" },
  { value: "CAMPUS", label: "Campus" },
  { value: "ARTS", label: "Arts" },
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "FOOD", label: "Food & Drink" },
  { value: "OTHER", label: "Other" },
];
