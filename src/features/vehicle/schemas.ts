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
export const vehicleColorSchema = optionalTrimmedText(40, "Color");
export const vehicleDescriptionSchema = optionalTrimmedText(2000, "Description");

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
};

// Full-object schema for the server action's authoritative parse. Fuel
// type/transmission are constrained to the fixed lists above; body type is
// free text server-side (mirroring the `body_type` column itself, which
// carries no FK/check constraint to vehicle_types) but still trimmed and
// length-capped.
export const vehicleSchema = z.object({
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
});

// Statuses an owner may set directly. PENDING_REVIEW and REJECTED are
// reserved for the Day 4 admin moderation flow (ADM-004) — no such workflow
// exists yet, so every vehicle an owner creates starts and stays in DRAFT
// until they explicitly publish it.
export const OWNER_SETTABLE_VEHICLE_STATUSES = ["DRAFT", "ACTIVE", "SOLD", "INACTIVE"] as const;
export const ownerVehicleStatusSchema = z.enum(OWNER_SETTABLE_VEHICLE_STATUSES);
