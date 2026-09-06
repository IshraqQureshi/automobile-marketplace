import { describe, expect, it } from "vitest";
import { adminSettableRoleSchema, editUserSchema, newUserSchema } from "./user-schemas";

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

describe("newUserSchema", () => {
  const valid = { fullName: "New Person", email: "new-person@example.com", phone: "712345678", role: "CUSTOMER" };

  it("accepts a fully valid new-user submission", () => {
    expect(newUserSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty phone — optional at invite time", () => {
    expect(newUserSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
  });

  it("rejects a blank full name", () => {
    expect(newUserSchema.safeParse({ ...valid, fullName: "" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(newUserSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a role outside CUSTOMER/ADMIN", () => {
    expect(newUserSchema.safeParse({ ...valid, role: "SHOWROOM" }).success).toBe(false);
  });
});

describe("editUserSchema", () => {
  it("accepts valid name/email/phone with no role field required", () => {
    const result = editUserSchema.safeParse({ fullName: "Existing Person", email: "existing@example.com", phone: "" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(editUserSchema.safeParse({ fullName: "Existing Person", email: "nope", phone: "" }).success).toBe(false);
  });
});
