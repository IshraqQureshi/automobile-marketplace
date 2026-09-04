import { z } from "zod";

export const catalogNameSchema = z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters");
