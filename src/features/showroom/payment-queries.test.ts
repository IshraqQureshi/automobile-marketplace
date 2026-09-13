import { describe, expect, it } from "vitest";
import { getCurrentSubscriptionStatus, type ShowroomPaymentItem } from "./payment-queries";

function makeItem(overrides: Partial<ShowroomPaymentItem>): ShowroomPaymentItem {
  return {
    id: "id",
    amount: 60000,
    currency: "KES",
    paymentMethod: "MPESA",
    reference: null,
    notes: null,
    status: "RECORDED",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getCurrentSubscriptionStatus", () => {
  it("returns null when the showroom has no payments on record yet", () => {
    expect(getCurrentSubscriptionStatus([])).toBeNull();
  });

  it("ignores VOIDED payments entirely, even if they'd otherwise be the latest", () => {
    const voided = makeItem({ id: "voided", status: "VOIDED", endDate: "2026-12-31" });
    const recorded = makeItem({ id: "recorded", endDate: "2026-06-30" });
    const result = getCurrentSubscriptionStatus([voided, recorded]);
    expect(result?.endDate).toBe("2026-06-30");
  });

  it("picks the payment with the latest end date as the current period", () => {
    const older = makeItem({ id: "older", endDate: "2026-03-31" });
    const newer = makeItem({ id: "newer", endDate: "2026-06-30" });
    const result = getCurrentSubscriptionStatus([older, newer]);
    expect(result?.endDate).toBe("2026-06-30");
  });

  it("returns null when every payment on record is VOIDED", () => {
    const voided = makeItem({ id: "voided", status: "VOIDED" });
    expect(getCurrentSubscriptionStatus([voided])).toBeNull();
  });
});
