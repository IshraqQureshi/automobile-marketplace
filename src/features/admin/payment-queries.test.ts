import { describe, expect, it } from "vitest";
import { computeSubscriptionUrgency, latestPerShowroom, type SubscriptionPaymentListItem } from "./payment-queries";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("computeSubscriptionUrgency", () => {
  it("is ACTIVE when the end date is well in the future", () => {
    expect(computeSubscriptionUrgency("2026-08-01", NOW)).toBe("ACTIVE");
  });

  it("is EXPIRING_SOON within the 14-day window", () => {
    expect(computeSubscriptionUrgency("2026-06-20", NOW)).toBe("EXPIRING_SOON");
    expect(computeSubscriptionUrgency("2026-06-29", NOW)).toBe("EXPIRING_SOON");
  });

  it("is ACTIVE exactly one day past the 14-day window", () => {
    expect(computeSubscriptionUrgency("2026-06-30", NOW)).toBe("ACTIVE");
  });

  it("is EXPIRING_SOON on the exact end date (0 days remaining)", () => {
    expect(computeSubscriptionUrgency("2026-06-15", NOW)).toBe("EXPIRING_SOON");
  });

  it("is OVERDUE once the end date has passed", () => {
    expect(computeSubscriptionUrgency("2026-06-14", NOW)).toBe("OVERDUE");
    expect(computeSubscriptionUrgency("2025-01-01", NOW)).toBe("OVERDUE");
  });
});

function makeItem(overrides: Partial<SubscriptionPaymentListItem>): SubscriptionPaymentListItem {
  return {
    id: "id",
    showroomId: "showroom-a",
    showroomName: "Showroom A",
    amount: 60000,
    currency: "KES",
    paymentMethod: "MPESA",
    reference: null,
    notes: null,
    status: "RECORDED",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    createdAt: "2026-01-01T00:00:00Z",
    reminderSentAt: null,
    ...overrides,
  };
}

describe("latestPerShowroom", () => {
  it("keeps only the row with the latest end date per showroom", () => {
    const older = makeItem({ id: "older", endDate: "2026-03-31" });
    const newer = makeItem({ id: "newer", endDate: "2026-06-30" });
    const result = latestPerShowroom([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("newer");
  });

  it("keeps separate rows for different showrooms", () => {
    const a = makeItem({ id: "a", showroomId: "showroom-a" });
    const b = makeItem({ id: "b", showroomId: "showroom-b" });
    expect(latestPerShowroom([a, b])).toHaveLength(2);
  });

  it("excludes VOIDED rows entirely", () => {
    const voided = makeItem({ id: "voided", status: "VOIDED", endDate: "2026-12-31" });
    const recorded = makeItem({ id: "recorded", endDate: "2026-03-31" });
    const result = latestPerShowroom([voided, recorded]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("recorded");
  });
});
