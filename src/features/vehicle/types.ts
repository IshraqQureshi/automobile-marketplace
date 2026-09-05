// Shared vehicle types/constants — used by both vehicle-list.tsx (the
// table) and vehicle-form.tsx (the create/edit page), so kept here instead
// of defined in either one to avoid a circular import between them.

export type VehicleStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SOLD" | "INACTIVE" | "REJECTED";

export interface VehiclePhoto {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface VehicleListItem {
  id: string;
  title: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  price: number;
  mileage: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyType: string | null;
  color: string | null;
  description: string | null;
  engine: string | null;
  interior: string | null;
  doors: number | null;
  seats: number | null;
  countryOfOrigin: string | null;
  installmentEnabled: boolean;
  bankFinanceEnabled: boolean;
  financingDownPaymentType: "PERCENT" | "FIXED";
  financingDownPaymentPercent: number | null;
  financingDownPaymentAmount: number | null;
  financingInterestRate: number | null;
  financingInsurancePercent: number | null;
  financingPartner: string | null;
  financingTenureMonths: number[] | null;
  financingTrackerOptions: { duration: string; price: number }[] | null;
  status: VehicleStatus;
  photos: VehiclePhoto[];
}

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  ACTIVE: "Published",
  SOLD: "Sold",
  INACTIVE: "Removed",
  REJECTED: "Rejected",
};

// Owner-settable subset only (mirrors OWNER_SETTABLE_VEHICLE_STATUSES in
// src/features/vehicle/schemas.ts) — PENDING_REVIEW/REJECTED are Day 4 admin
// moderation states an owner can't set directly, so they never appear as a
// selectable option even if a vehicle happened to carry one.
export const OWNER_STATUS_OPTIONS: VehicleStatus[] = ["DRAFT", "ACTIVE", "SOLD", "INACTIVE"];

export const STATUS_BADGE_CLASSES: Record<VehicleStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-500",
  PENDING_REVIEW: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  SOLD: "bg-blue-50 text-blue-700",
  INACTIVE: "bg-neutral-100 text-neutral-400",
  REJECTED: "bg-red-50 text-red-700",
};

export const currencyFormatter = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export interface CatalogOption {
  id: string;
  name: string;
}

export interface ModelOption extends CatalogOption {
  brandId: string;
}
