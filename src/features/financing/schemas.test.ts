import { describe, expect, it } from "vitest";
import {
  financingDesiredDownPaymentSchema,
  financingDesiredInsuranceTypeSchema,
  financingDesiredTenureMonthsSchema,
  financingDesiredTrackerDurationSchema,
  financingEmploymentStatusSchema,
  financingMonthlyIncomeSchema,
  financingNationalIdSchema,
  financingNotesSchema,
} from "./schemas";

describe("financingEmploymentStatusSchema", () => {
  it("accepts each real option", () => {
    for (const value of ["EMPLOYED", "SELF_EMPLOYED", "BUSINESS_OWNER"]) {
      expect(financingEmploymentStatusSchema.safeParse(value).success).toBe(true);
    }
  });

  it("rejects an unrecognized value", () => {
    expect(financingEmploymentStatusSchema.safeParse("RETIRED").success).toBe(false);
  });

  it("rejects a blank value", () => {
    expect(financingEmploymentStatusSchema.safeParse("").success).toBe(false);
  });
});

describe("financingMonthlyIncomeSchema", () => {
  it("accepts a positive integer string", () => {
    const result = financingMonthlyIncomeSchema.safeParse("80000");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(80000);
  });

  it("accepts a decimal string", () => {
    expect(financingMonthlyIncomeSchema.safeParse("80000.50").success).toBe(true);
  });

  it("rejects zero", () => {
    expect(financingMonthlyIncomeSchema.safeParse("0").success).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    expect(financingMonthlyIncomeSchema.safeParse("not-a-number").success).toBe(false);
  });

  it("rejects a blank string", () => {
    expect(financingMonthlyIncomeSchema.safeParse("").success).toBe(false);
  });
});

describe("financingNationalIdSchema", () => {
  it("accepts a valid ID number", () => {
    expect(financingNationalIdSchema.safeParse("12345678").success).toBe(true);
  });

  it("rejects a too-short value", () => {
    expect(financingNationalIdSchema.safeParse("123").success).toBe(false);
  });

  it("rejects a value over 20 characters", () => {
    expect(financingNationalIdSchema.safeParse("1".repeat(21)).success).toBe(false);
  });
});

describe("financingDesiredDownPaymentSchema", () => {
  it("accepts zero", () => {
    expect(financingDesiredDownPaymentSchema.safeParse("0").success).toBe(true);
  });

  it("accepts a positive amount", () => {
    const result = financingDesiredDownPaymentSchema.safeParse("500000");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(500000);
  });

  it("rejects a negative value string", () => {
    expect(financingDesiredDownPaymentSchema.safeParse("-100").success).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    expect(financingDesiredDownPaymentSchema.safeParse("abc").success).toBe(false);
  });
});

describe("financingDesiredTenureMonthsSchema", () => {
  it("accepts a positive integer string", () => {
    const result = financingDesiredTenureMonthsSchema.safeParse("36");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(36);
  });

  it("rejects zero", () => {
    expect(financingDesiredTenureMonthsSchema.safeParse("0").success).toBe(false);
  });

  it("rejects a non-integer string", () => {
    expect(financingDesiredTenureMonthsSchema.safeParse("36.5").success).toBe(false);
  });

  it("rejects a blank string", () => {
    expect(financingDesiredTenureMonthsSchema.safeParse("").success).toBe(false);
  });
});

describe("financingNotesSchema", () => {
  it("accepts a blank value", () => {
    const result = financingNotesSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it("accepts real notes", () => {
    const result = financingNotesSchema.safeParse("Please call after 5pm.");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Please call after 5pm.");
  });

  it("rejects notes over 1000 characters", () => {
    expect(financingNotesSchema.safeParse("a".repeat(1001)).success).toBe(false);
  });
});

describe("financingDesiredInsuranceTypeSchema", () => {
  it("accepts PSV", () => {
    const result = financingDesiredInsuranceTypeSchema.safeParse("PSV");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("PSV");
  });

  it("accepts PRIVATE", () => {
    const result = financingDesiredInsuranceTypeSchema.safeParse("PRIVATE");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("PRIVATE");
  });

  it("treats a blank string as unset (undefined), not an error — a vehicle with only one insurance rate configured has nothing to pick", () => {
    const result = financingDesiredInsuranceTypeSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it("treats a missing value as unset, not an error", () => {
    const result = financingDesiredInsuranceTypeSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it("rejects an invalid insurance type", () => {
    expect(financingDesiredInsuranceTypeSchema.safeParse("COMPREHENSIVE").success).toBe(false);
  });
});

// Regression guard: this schema shipped before the one above, in the exact
// same optional-label shape — asserting both stay consistent so a future
// edit to one doesn't accidentally diverge the other's "blank means unset"
// convention.
describe("financingDesiredTrackerDurationSchema", () => {
  it("treats a blank string as unset", () => {
    const result = financingDesiredTrackerDurationSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it("accepts a real duration label", () => {
    const result = financingDesiredTrackerDurationSchema.safeParse("2 Years");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("2 Years");
  });
});
