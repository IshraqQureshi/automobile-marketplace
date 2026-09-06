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
  createdAt: string;
}

// Public-facing pages (homepage highlights, marketplace listing/detail) all
// need the owning showroom's name alongside the vehicle — kept as one shared
// extension instead of each page redeclaring its own near-identical
// "VehicleListItem + showroom name" interface.
export interface VehicleWithShowroom extends VehicleListItem {
  showroomId: string;
  showroomName: string;
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

// The exact select() column list both vehicle pages (list, edit) query —
// kept alongside the mapper below so the two can't silently drift apart.
export const VEHICLE_SELECT_COLUMNS =
  "id, title, make, model, variant, year, price, mileage, fuel_type, transmission, body_type, color, description, engine, interior, doors, seats, country_of_origin, installment_enabled, bank_finance_enabled, financing_down_payment_type, financing_down_payment_percent, financing_down_payment_amount, financing_interest_rate, financing_insurance_percent, financing_partner, financing_tenure_options_months, financing_tracker_options, status, created_at, vehicle_media(id, storage_path, is_primary, sort_order)";

interface VehicleRow {
  id: string;
  title: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  price: number;
  mileage: number | null;
  fuel_type: string | null;
  transmission: string | null;
  body_type: string | null;
  color: string | null;
  description: string | null;
  engine: string | null;
  interior: string | null;
  doors: number | null;
  seats: number | null;
  country_of_origin: string | null;
  installment_enabled: boolean;
  bank_finance_enabled: boolean;
  financing_down_payment_type: string;
  financing_down_payment_percent: number | null;
  financing_down_payment_amount: number | null;
  financing_interest_rate: number | null;
  financing_insurance_percent: number | null;
  financing_partner: string | null;
  financing_tenure_options_months: number[] | null;
  financing_tracker_options: unknown;
  status: VehicleStatus;
  created_at: string;
  vehicle_media: { id: string; storage_path: string; is_primary: boolean; sort_order: number }[];
}

/**
 * Maps one row shaped by VEHICLE_SELECT_COLUMNS (list page, edit page — both
 * query the exact same columns) into a VehicleListItem, resolving each
 * photo's public Storage URL. Kept in one place so adding a column only
 * ever needs updating here, not independently in both page components —
 * this exact "missed one call site" risk is what motivated pulling it out.
 */
export function vehicleRowToListItem(vehicle: VehicleRow, getPhotoUrl: (storagePath: string) => string): VehicleListItem {
  const media = [...vehicle.vehicle_media].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: vehicle.id,
    title: vehicle.title,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    price: vehicle.price,
    mileage: vehicle.mileage,
    fuelType: vehicle.fuel_type,
    transmission: vehicle.transmission,
    bodyType: vehicle.body_type,
    color: vehicle.color,
    description: vehicle.description,
    engine: vehicle.engine,
    interior: vehicle.interior,
    doors: vehicle.doors,
    seats: vehicle.seats,
    countryOfOrigin: vehicle.country_of_origin,
    installmentEnabled: vehicle.installment_enabled,
    bankFinanceEnabled: vehicle.bank_finance_enabled,
    financingDownPaymentType: vehicle.financing_down_payment_type as "PERCENT" | "FIXED",
    financingDownPaymentPercent: vehicle.financing_down_payment_percent,
    financingDownPaymentAmount: vehicle.financing_down_payment_amount,
    financingInterestRate: vehicle.financing_interest_rate,
    financingInsurancePercent: vehicle.financing_insurance_percent,
    financingPartner: vehicle.financing_partner,
    financingTenureMonths: vehicle.financing_tenure_options_months,
    financingTrackerOptions: vehicle.financing_tracker_options as { duration: string; price: number }[] | null,
    status: vehicle.status,
    photos: media.map((m) => ({ id: m.id, isPrimary: m.is_primary, url: getPhotoUrl(m.storage_path) })),
    createdAt: vehicle.created_at,
  };
}
