import { describe, expect, it } from "vitest";
import {
  vehicleMakeSchema,
  vehicleMileageOptionalSchema,
  vehicleModelSchema,
  vehiclePriceSchema,
  vehicleSchema,
  vehicleTitleSchema,
  vehicleYearSchema,
} from "./schemas";

const validFullVehicle = {
  title: "2019 Toyota Camry SE",
  make: "Toyota",
  model: "Camry",
  variant: "SE",
  year: "2019",
  price: "2500000",
  mileage: "45000",
  fuelType: "Petrol",
  transmission: "Automatic",
  bodyType: "Sedan",
  color: "White",
  description: "Well maintained, full service history.",
  engine: "2.0L Turbo Petrol",
  interior: "Leather",
  doors: "4",
  seats: "5",
  countryOfOrigin: "Japan",
  installmentEnabled: "true",
  bankFinanceEnabled: "false",
  financingDownPaymentType: "PERCENT",
  financingDownPaymentPercent: "20",
  financingDownPaymentAmount: "",
  financingInterestRate: "12.5",
  financingInsurancePercent: "3",
  financingPartner: "KCB Bank",
  financingTenureMonths: ["12", "24"],
  financingTracker1YearPrice: "15000",
  financingTracker2YearPrice: "",
};

describe("vehicleTitleSchema", () => {
  it("accepts a valid title", () => {
    expect(vehicleTitleSchema.safeParse("2019 Toyota Camry").success).toBe(true);
  });

  it("rejects a blank title", () => {
    expect(vehicleTitleSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a title over 150 characters", () => {
    expect(vehicleTitleSchema.safeParse("A".repeat(151)).success).toBe(false);
  });
});

describe("vehicleMakeSchema / vehicleModelSchema", () => {
  it("rejects a blank make", () => {
    expect(vehicleMakeSchema.safeParse("").success).toBe(false);
  });

  it("rejects a blank model", () => {
    expect(vehicleModelSchema.safeParse("").success).toBe(false);
  });
});

describe("vehicleYearSchema", () => {
  it("accepts a valid 4-digit year", () => {
    const result = vehicleYearSchema.safeParse("2019");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(2019);
  });

  it("rejects a year before 1900", () => {
    expect(vehicleYearSchema.safeParse("1899").success).toBe(false);
  });

  it("rejects a year more than one year in the future", () => {
    const nextYearPlusTwo = new Date().getFullYear() + 2;
    expect(vehicleYearSchema.safeParse(String(nextYearPlusTwo)).success).toBe(false);
  });

  it("rejects a non-numeric year", () => {
    expect(vehicleYearSchema.safeParse("abcd").success).toBe(false);
  });

  it("rejects an empty year", () => {
    expect(vehicleYearSchema.safeParse("").success).toBe(false);
  });
});

describe("vehiclePriceSchema", () => {
  it("accepts a valid decimal price", () => {
    const result = vehiclePriceSchema.safeParse("2500000.50");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(2500000.5);
  });

  it("rejects zero", () => {
    expect(vehiclePriceSchema.safeParse("0").success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(vehiclePriceSchema.safeParse("-100").success).toBe(false);
  });

  it("rejects an empty price", () => {
    expect(vehiclePriceSchema.safeParse("").success).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(vehiclePriceSchema.safeParse("free").success).toBe(false);
  });
});

describe("vehicleMileageOptionalSchema", () => {
  it("accepts an empty value as undefined", () => {
    const result = vehicleMileageOptionalSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it("accepts a valid mileage", () => {
    const result = vehicleMileageOptionalSchema.safeParse("45000");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(45000);
  });

  it("rejects a negative mileage", () => {
    expect(vehicleMileageOptionalSchema.safeParse("-1").success).toBe(false);
  });

  it("rejects a non-numeric mileage", () => {
    expect(vehicleMileageOptionalSchema.safeParse("lots").success).toBe(false);
  });
});

describe("vehicleSchema (full object)", () => {
  it("accepts a fully populated valid vehicle", () => {
    const result = vehicleSchema.safeParse(validFullVehicle);
    expect(result.success).toBe(true);
  });

  it("accepts only the required fields, defaulting the rest to undefined", () => {
    const result = vehicleSchema.safeParse({
      title: "2019 Toyota Camry",
      make: "Toyota",
      model: "Camry",
      variant: "",
      year: "2019",
      price: "2500000",
      mileage: "",
      fuelType: "",
      transmission: "",
      bodyType: "",
      color: "",
      description: "",
      engine: "",
      interior: "",
      doors: "",
      seats: "",
      countryOfOrigin: "",
      installmentEnabled: "",
      bankFinanceEnabled: "",
      financingDownPaymentPercent: "",
      financingDownPaymentAmount: "",
      financingInterestRate: "",
      financingInsurancePercent: "",
      financingPartner: "",
      financingTenureMonths: [],
      financingTracker1YearPrice: "",
      financingTracker2YearPrice: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.variant).toBeUndefined();
      expect(result.data.fuelType).toBeUndefined();
      expect(result.data.transmission).toBeUndefined();
      expect(result.data.installmentEnabled).toBe(false);
      expect(result.data.financingDownPaymentType).toBe("PERCENT");
    }
  });

  it("accepts a fixed down payment amount and drops the unused percent field", () => {
    const result = vehicleSchema.safeParse({
      ...validFullVehicle,
      financingDownPaymentType: "FIXED",
      financingDownPaymentAmount: "500000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.financingDownPaymentAmount).toBe(500000);
      expect(result.data.financingDownPaymentPercent).toBeUndefined();
    }
  });

  it("rejects an invalid loan tenure option", () => {
    const result = vehicleSchema.safeParse({ ...validFullVehicle, financingTenureMonths: ["13"] });
    expect(result.success).toBe(false);
  });

  it("combines tracker fees into financingTrackerOptions", () => {
    const result = vehicleSchema.safeParse({
      ...validFullVehicle,
      financingTracker1YearPrice: "15000",
      financingTracker2YearPrice: "28000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.financingTrackerOptions).toEqual([
        { duration: "1 Year", price: 15000 },
        { duration: "2 Years", price: 28000 },
      ]);
    }
  });

  it("rejects doors/seats outside their valid range", () => {
    expect(vehicleSchema.safeParse({ ...validFullVehicle, doors: "11" }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...validFullVehicle, seats: "21" }).success).toBe(false);
  });

  it("rejects a fuel type outside the fixed list", () => {
    const result = vehicleSchema.safeParse({ ...validFullVehicle, fuelType: "Nuclear" });
    expect(result.success).toBe(false);
  });

  it("rejects a transmission outside the fixed list", () => {
    const result = vehicleSchema.safeParse({ ...validFullVehicle, transmission: "Telepathic" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const result = vehicleSchema.safeParse({ ...validFullVehicle, make: "" });
    expect(result.success).toBe(false);
  });
});
