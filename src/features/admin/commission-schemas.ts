import { z } from "zod";

export const COMMISSION_STATUSES = ["PENDING", "PAID"] as const;

export const commissionFieldSchemas = {
  amount: z.coerce.number().min(0, "Commission amount can't be negative").max(1_000_000_000, "Enter a realistic amount"),
  status: z.enum(COMMISSION_STATUSES, { message: "Choose a status" }),
  notes: z.string().trim().max(500, "Notes must be under 500 characters").optional(),
};
