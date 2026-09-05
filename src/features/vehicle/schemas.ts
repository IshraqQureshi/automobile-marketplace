import { z } from "zod";

// Fixed app-level lists rather than an admin-managed catalog table — unlike
// body type (below), there's no existing catalog entity for these and the
// requirements don't call for one; a showroom picks from these via a plain
// <select>, so the server only needs to guard against a direct (non-UI)
// action call, not free-text input.
export const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"] as const;
export const TRANSMISSIONS = ["Manual", "Automatic", "CVT"] as const;

const CURRENT_YEAR = new Date().getFullYear();
const INTEGER_REGEX = /^\d+$/;
const DECIMAL_REGEX = /^\d+(\.\d+)?$/;

export const vehicleTitleSchema = z.string().trim().min(1, "Title is required").max(150, "Title must be under 150 characters");
export const vehicleMakeSchema = z.string().trim().min(1, "Make is required").max(60, "Make must be under 60 characters");
export const vehicleModelSchema = z.string().trim().min(1, "Model is required").max(60, "Model must be under 60 characters");

// useFieldValidation calls every field schema's safeParse with the raw
// string straight from the input's onBlur — numeric fields validate the
// string shape first (so an empty/non-numeric value gets a clear message
// instead of zod's generic "Expected number, received string"), same
// trim → pipe → transform shape as kenyaLocalPhoneSchema
// (src/lib/validation/kenya-phone.ts).
export const vehicleYearSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(/^\d{4}$/, "Enter a 4-digit year"))
  .transform(Number)
  .pipe(z.number().min(1900, "Year must be 1900 or later").max(CURRENT_YEAR + 1, `Year must be ${CURRENT_YEAR + 1} or earlier`));

export const vehiclePriceSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(DECIMAL_REGEX, "Enter a valid price"))
  .transform(Number)
  .pipe(z.number().positive("Price must be greater than zero").max(999_999_999, "Price is too large"));

// Mileage, variant, color, description, fuel type, transmission, and body
// type are all nullable in the `vehicles` table — no DB constraint requires
// them, so an empty field is always valid here too.
export const vehicleMileageOptionalSchema = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.string().regex(INTEGER_REGEX, "Enter a valid mileage")]))
  .transform((value) => (value === "" ? undefined : Number(value)));

const optionalTrimmedText = (maxLength: number, label: string) =>
  z
    .string()
    .trim()
    .max(maxLength, `${label} must be under ${maxLength} characters`)
    .transform((value) => value || undefined);

export const vehicleVariantSchema = optionalTrimmedText(60, "Variant");
export const vehicleColorSchema = optionalTrimmedText(40, "Colour");
export const vehicleDescriptionSchema = optionalTrimmedText(2000, "Description");
export const vehicleEngineSchema = optionalTrimmedText(60, "Engine");
export const vehicleInteriorSchema = optionalTrimmedText(60, "Interior");
export const vehicleCountryOfOriginSchema = optionalTrimmedText(60, "Country of origin");

const optionalSmallInteger = (max: number, label: string) =>
  z
    .string()
    .trim()
    .pipe(z.union([z.literal(""), z.string().regex(INTEGER_REGEX, `Enter a valid ${label.toLowerCase()}`)]))
    .transform((value) => (value === "" ? undefined : Number(value)))
    .pipe(z.number().max(max, `${label} must be ${max} or fewer`).optional());

export const vehicleDoorsSchema = optionalSmallInteger(10, "Doors");
export const vehicleSeatsSchema = optionalSmallInteger(20, "Seats");

// Percentages (down payment/interest/insurance) share the same 0-100 shape
// as the existing DB check constraints — reused here for the per-field
// onBlur check too, not just the full-object parse.
const optionalPercent = (label: string) =>
  z
    .string()
    .trim()
    .pipe(z.union([z.literal(""), z.string().regex(DECIMAL_REGEX, `Enter a valid ${label.toLowerCase()}`)]))
    .transform((value) => (value === "" ? undefined : Number(value)))
    .pipe(z.number().min(0, `${label} cannot be negative`).max(100, `${label} cannot exceed 100%`).optional());

const optionalNonNegativeAmount = (label: string) =>
  z
    .string()
    .trim()
    .pipe(z.union([z.literal(""), z.string().regex(DECIMAL_REGEX, `Enter a valid ${label.toLowerCase()}`)]))
    .transform((value) => (value === "" ? undefined : Number(value)))
    .pipe(z.number().min(0, `${label} cannot be negative`).optional());

export const vehicleDownPaymentPercentSchema = optionalPercent("Down payment");
export const vehicleDownPaymentAmountSchema = optionalNonNegativeAmount("Down payment amount");
export const vehicleInterestRateSchema = optionalNonNegativeAmount("Interest rate");
export const vehicleInsurancePercentSchema = optionalPercent("Insurance");
export const vehicleFinancingPartnerSchema = optionalTrimmedText(100, "Financing partner");
export const vehicleTracker1YearPriceSchema = optionalNonNegativeAmount("1-year tracker fee");
export const vehicleTracker2YearPriceSchema = optionalNonNegativeAmount("2-year tracker fee");

export const DOWN_PAYMENT_TYPES = ["PERCENT", "FIXED"] as const;
export type DownPaymentType = (typeof DOWN_PAYMENT_TYPES)[number];
export const LOAN_TENURE_OPTIONS_MONTHS = [12, 24, 36, 48, 60, 72] as const;

// Shape object for useFieldValidation (Record<string, ZodType>) — same
// convention as catalogFieldSchemas/showroomFieldSchemas. Fuel type,
// transmission, and body type are plain <select> dropdowns with no invalid
// free-text state to catch on blur, so they're validated only as part of
// the full vehicleSchema below, not here.
export const vehicleFieldSchemas = {
  title: vehicleTitleSchema,
  make: vehicleMakeSchema,
  model: vehicleModelSchema,
  year: vehicleYearSchema,
  price: vehiclePriceSchema,
  mileage: vehicleMileageOptionalSchema,
  variant: vehicleVariantSchema,
  color: vehicleColorSchema,
  description: vehicleDescriptionSchema,
  engine: vehicleEngineSchema,
  interior: vehicleInteriorSchema,
  doors: vehicleDoorsSchema,
  seats: vehicleSeatsSchema,
  countryOfOrigin: vehicleCountryOfOriginSchema,
  financingDownPaymentPercent: vehicleDownPaymentPercentSchema,
  financingDownPaymentAmount: vehicleDownPaymentAmountSchema,
  financingInterestRate: vehicleInterestRateSchema,
  financingInsurancePercent: vehicleInsurancePercentSchema,
  financingPartner: vehicleFinancingPartnerSchema,
  financingTracker1YearPrice: vehicleTracker1YearPriceSchema,
  financingTracker2YearPrice: vehicleTracker2YearPriceSchema,
};

// Full-object schema for the server action's authoritative parse. Fuel
// type/transmission are constrained to the fixed lists above; body type is
// free text server-side (mirroring the `body_type` column itself, which
// carries no FK/check constraint to vehicle_types) but still trimmed and
// length-capped.
const booleanFlagSchema = z
  .string()
  .optional()
  .transform((value) => value === "true");

const tenureMonthsSchema = z
  .array(z.string())
  .optional()
  .transform((value) => (value ?? []).map(Number))
  .pipe(
    z
      .array(z.number().int())
      .refine((months) => months.every((m) => (LOAN_TENURE_OPTIONS_MONTHS as readonly number[]).includes(m)), {
        message: "Invalid loan tenure option",
      }),
  )
  .transform((months) => (months.length > 0 ? months : undefined));

export const vehicleSchema = z
  .object({
    title: vehicleTitleSchema,
    make: vehicleMakeSchema,
    model: vehicleModelSchema,
    variant: vehicleVariantSchema,
    year: vehicleYearSchema,
    price: vehiclePriceSchema,
    mileage: vehicleMileageOptionalSchema,
    fuelType: z
      .union([z.literal(""), z.enum(FUEL_TYPES)])
      .optional()
      .transform((value) => value || undefined),
    transmission: z
      .union([z.literal(""), z.enum(TRANSMISSIONS)])
      .optional()
      .transform((value) => value || undefined),
    bodyType: optionalTrimmedText(60, "Body type"),
    color: vehicleColorSchema,
    description: vehicleDescriptionSchema,
    engine: vehicleEngineSchema,
    interior: vehicleInteriorSchema,
    doors: vehicleDoorsSchema,
    seats: vehicleSeatsSchema,
    countryOfOrigin: vehicleCountryOfOriginSchema,
    installmentEnabled: booleanFlagSchema,
    bankFinanceEnabled: booleanFlagSchema,
    financingDownPaymentType: z.enum(DOWN_PAYMENT_TYPES).default("PERCENT"),
    financingDownPaymentPercent: vehicleDownPaymentPercentSchema,
    financingDownPaymentAmount: vehicleDownPaymentAmountSchema,
    financingInterestRate: vehicleInterestRateSchema,
    financingInsurancePercent: vehicleInsurancePercentSchema,
    financingPartner: vehicleFinancingPartnerSchema,
    financingTenureMonths: tenureMonthsSchema,
    financingTracker1YearPrice: vehicleTracker1YearPriceSchema,
    financingTracker2YearPrice: vehicleTracker2YearPriceSchema,
  })
  .transform((data) => {
    // Only the active down-payment figure (per financingDownPaymentType) is
    // kept — the inactive one is dropped rather than persisted stale, since
    // the UI only ever shows one of the two inputs at a time.
    const financingTrackerOptions =
      data.financingTracker1YearPrice != null || data.financingTracker2YearPrice != null
        ? [
            ...(data.financingTracker1YearPrice != null ? [{ duration: "1 Year", price: data.financingTracker1YearPrice }] : []),
            ...(data.financingTracker2YearPrice != null ? [{ duration: "2 Years", price: data.financingTracker2YearPrice }] : []),
          ]
        : undefined;

    return {
      ...data,
      financingDownPaymentPercent: data.financingDownPaymentType === "PERCENT" ? data.financingDownPaymentPercent : undefined,
      financingDownPaymentAmount: data.financingDownPaymentType === "FIXED" ? data.financingDownPaymentAmount : undefined,
      financingTrackerOptions,
    };
  });

// Statuses an owner may set directly. PENDING_REVIEW and REJECTED are
// reserved for the Day 4 admin moderation flow (ADM-004) — no such workflow
// exists yet, so every vehicle an owner creates starts and stays in DRAFT
// until they explicitly publish it.
export const OWNER_SETTABLE_VEHICLE_STATUSES = ["DRAFT", "ACTIVE", "SOLD", "INACTIVE"] as const;
export const ownerVehicleStatusSchema = z.enum(OWNER_SETTABLE_VEHICLE_STATUSES);
