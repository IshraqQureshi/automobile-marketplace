import { z } from "zod";

export const catalogNameSchema = z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters");

// Wrapped as a shape object (rather than the bare schema) so it fits
// useFieldValidation's Record<string, ZodType> contract, same convention as
// registerShowroomFieldSchemas — shared by CatalogList/CatalogModelsList/
// CatalogBrandsList's single "name" field, and by createBrandAction/etc.'s
// pre-submit client-side check, so invalid input never reaches the server
// action for a false "it looked fine" round trip.
export const catalogFieldSchemas = { name: catalogNameSchema };

// Moved to src/lib/validation/logo.ts now that showroom logos (admin
// showroom CRUD) need the exact same constraints — re-exported here so
// existing importers of these two names from this module aren't broken.
export { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_SIZE_BYTES } from "@/lib/validation/logo";
