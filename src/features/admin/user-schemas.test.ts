import { describe, expect, it } from "vitest";
import { adminSettableRoleSchema } from "./user-schemas";

describe("adminSettableRoleSchema", () => {
  it("accepts CUSTOMER and ADMIN", () => {
    expect(adminSettableRoleSchema.safeParse("CUSTOMER").success).toBe(true);
    expect(adminSettableRoleSchema.safeParse("ADMIN").success).toBe(true);
  });

  it("rejects SHOWROOM — a real enum value, but not one an admin should set from this screen", () => {
    expect(adminSettableRoleSchema.safeParse("SHOWROOM").success).toBe(false);
  });

  it("rejects a nonsense value", () => {
    expect(adminSettableRoleSchema.safeParse("SUPERUSER").success).toBe(false);
    expect(adminSettableRoleSchema.safeParse("").success).toBe(false);
  });
});
