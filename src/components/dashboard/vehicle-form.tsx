"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DialogFormActions, FieldLabel } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { createVehicleAction, updateVehicleAction, updateVehicleStatusAction } from "@/features/vehicle/actions";
import {
  DOWN_PAYMENT_TYPES,
  FUEL_TYPES,
  LOAN_TENURE_OPTIONS_MONTHS,
  TRANSMISSIONS,
  vehicleFieldSchemas,
  type DownPaymentType,
} from "@/features/vehicle/schemas";
import {
  OWNER_STATUS_OPTIONS,
  STATUS_LABELS,
  type CatalogOption,
  type ModelOption,
  type VehicleListItem,
  type VehicleStatus,
} from "@/features/vehicle/types";

// Deliberately no width class baked in here — Tailwind's generated
// stylesheet orders `.w-full` after `.w-32` regardless of the order classes
// appear in a template string, so appending "w-32" after this constant (as
// the Deposit type select below does) silently lost to a `w-full` baked in
// here, leaving that select full-width and squeezing its sibling input down
// to a sliver (confirmed live: the Deposit value input rendered ~26px wide
// and overlapped the next grid column). Each call site adds its own width.
const selectClassName =
  "rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

interface VehicleFormState {
  title: string;
  status: VehicleStatus;
  brandId: string;
  make: string;
  model: string;
  variant: string;
  year: string;
  price: string;
  mileage: string;
  fuelType: string;
  transmission: string;
  bodyType: string;
  color: string;
  description: string;
  engine: string;
  interior: string;
  doors: string;
  seats: string;
  countryOfOrigin: string;
  installmentEnabled: boolean;
  bankFinanceEnabled: boolean;
  financingDownPaymentType: DownPaymentType;
  financingDownPaymentPercent: string;
  financingDownPaymentAmount: string;
  financingInterestRate: string;
  financingInsurancePercent: string;
  financingPartner: string;
  financingTenureMonths: string[];
  financingTracker1YearPrice: string;
  financingTracker2YearPrice: string;
}

function emptyForm(): VehicleFormState {
  return {
    title: "",
    status: "DRAFT",
    brandId: "",
    make: "",
    model: "",
    variant: "",
    year: "",
    price: "",
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
    installmentEnabled: false,
    bankFinanceEnabled: false,
    financingDownPaymentType: "PERCENT",
    financingDownPaymentPercent: "",
    financingDownPaymentAmount: "",
    financingInterestRate: "",
    financingInsurancePercent: "",
    financingPartner: "",
    financingTenureMonths: [],
    financingTracker1YearPrice: "",
    financingTracker2YearPrice: "",
  };
}

function formFromVehicle(vehicle: VehicleListItem, brands: CatalogOption[]): VehicleFormState {
  // The catalog dropdown is a UI convenience over the same free-text
  // make/model columns (they carry no FK to `brands`/`models` — see
  // src/features/vehicle/schemas.ts's note on bodyType for why) — match by
  // name to preselect the brand for editing; if a listing's `make` doesn't
  // match any current brand (renamed/deleted since), the dropdown just
  // starts unselected and the original text is kept until the owner picks
  // a real brand, exactly like bodyType already behaves.
  const matchedBrand = brands.find((b) => b.name === vehicle.make);
  return {
    title: vehicle.title,
    status: vehicle.status,
    brandId: matchedBrand?.id ?? "",
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant ?? "",
    year: String(vehicle.year),
    price: String(vehicle.price),
    mileage: vehicle.mileage != null ? String(vehicle.mileage) : "",
    fuelType: vehicle.fuelType ?? "",
    transmission: vehicle.transmission ?? "",
    bodyType: vehicle.bodyType ?? "",
    color: vehicle.color ?? "",
    description: vehicle.description ?? "",
    engine: vehicle.engine ?? "",
    interior: vehicle.interior ?? "",
    doors: vehicle.doors != null ? String(vehicle.doors) : "",
    seats: vehicle.seats != null ? String(vehicle.seats) : "",
    countryOfOrigin: vehicle.countryOfOrigin ?? "",
    installmentEnabled: vehicle.installmentEnabled,
    bankFinanceEnabled: vehicle.bankFinanceEnabled,
    financingDownPaymentType: vehicle.financingDownPaymentType,
    financingDownPaymentPercent: vehicle.financingDownPaymentPercent != null ? String(vehicle.financingDownPaymentPercent) : "",
    financingDownPaymentAmount: vehicle.financingDownPaymentAmount != null ? String(vehicle.financingDownPaymentAmount) : "",
    financingInterestRate: vehicle.financingInterestRate != null ? String(vehicle.financingInterestRate) : "",
    financingInsurancePercent: vehicle.financingInsurancePercent != null ? String(vehicle.financingInsurancePercent) : "",
    financingPartner: vehicle.financingPartner ?? "",
    financingTenureMonths: (vehicle.financingTenureMonths ?? []).map(String),
    financingTracker1YearPrice: String(vehicle.financingTrackerOptions?.find((t) => t.duration === "1 Year")?.price ?? ""),
    financingTracker2YearPrice: String(vehicle.financingTrackerOptions?.find((t) => t.duration === "2 Years")?.price ?? ""),
  };
}

const VALIDATED_FIELDS = [
  "title",
  "make",
  "model",
  "year",
  "price",
  "mileage",
  "variant",
  "color",
  "description",
  "engine",
  "interior",
  "doors",
  "seats",
  "countryOfOrigin",
] as const;

// Validated separately, and only when the Financing section is actually
// visible (form.installmentEnabled) — these fields' only inputs and error
// text live inside that conditionally-rendered section, so validating them
// unconditionally could block Save on a field the user can no longer see
// or fix (confirmed live: toggling installment off after typing an invalid
// value there left Save silently doing nothing).
const FINANCING_VALIDATED_FIELDS = [
  "financingDownPaymentPercent",
  "financingDownPaymentAmount",
  "financingInterestRate",
  "financingInsurancePercent",
  "financingPartner",
  "financingTracker1YearPrice",
  "financingTracker2YearPrice",
] as const;

interface VehicleFormProps {
  mode: "create" | "edit";
  vehicleId?: string;
  initialValues?: VehicleListItem;
  brands: CatalogOption[];
  models: ModelOption[];
  bodyTypeOptions: string[];
}

export function VehicleForm({ mode, vehicleId, initialValues, brands, models, bodyTypeOptions }: VehicleFormProps) {
  const router = useRouter();
  const toast = useToast();
  const { validate, errorFor } = useFieldValidation(vehicleFieldSchemas);
  const [form, setForm] = useState<VehicleFormState>(() => (initialValues ? formFromVehicle(initialValues, brands) : emptyForm()));
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const modelsForBrand = models.filter((m) => m.brandId === form.brandId);

  function setField<K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleBrandChange(brandId: string) {
    const brand = brands.find((b) => b.id === brandId);
    setForm((prev) => ({ ...prev, brandId, make: brand?.name ?? "", model: "" }));
  }

  function toggleTenure(months: number) {
    const value = String(months);
    setForm((prev) => ({
      ...prev,
      financingTenureMonths: prev.financingTenureMonths.includes(value)
        ? prev.financingTenureMonths.filter((m) => m !== value)
        : [...prev.financingTenureMonths, value],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    const fieldsToValidate: readonly ((typeof VALIDATED_FIELDS)[number] | (typeof FINANCING_VALIDATED_FIELDS)[number])[] = form.installmentEnabled
      ? [...VALIDATED_FIELDS, ...FINANCING_VALIDATED_FIELDS]
      : VALIDATED_FIELDS;
    for (const field of fieldsToValidate) {
      if (!vehicleFieldSchemas[field].safeParse(form[field]).success) {
        validate(field, form[field]);
        hasError = true;
      }
    }
    if (hasError) return;

    const formData = new FormData();
    formData.set("title", form.title);
    formData.set("make", form.make);
    formData.set("model", form.model);
    formData.set("variant", form.variant);
    formData.set("year", form.year);
    formData.set("price", form.price);
    formData.set("mileage", form.mileage);
    formData.set("fuelType", form.fuelType);
    formData.set("transmission", form.transmission);
    formData.set("bodyType", form.bodyType);
    formData.set("color", form.color);
    formData.set("description", form.description);
    formData.set("engine", form.engine);
    formData.set("interior", form.interior);
    formData.set("doors", form.doors);
    formData.set("seats", form.seats);
    formData.set("countryOfOrigin", form.countryOfOrigin);
    formData.set("installmentEnabled", String(form.installmentEnabled));
    formData.set("bankFinanceEnabled", String(form.bankFinanceEnabled));
    formData.set("financingDownPaymentType", form.financingDownPaymentType);
    formData.set("financingDownPaymentPercent", form.financingDownPaymentPercent);
    formData.set("financingDownPaymentAmount", form.financingDownPaymentAmount);
    formData.set("financingInterestRate", form.financingInterestRate);
    formData.set("financingInsurancePercent", form.financingInsurancePercent);
    formData.set("financingPartner", form.financingPartner);
    for (const months of form.financingTenureMonths) formData.append("financingTenureMonths", months);
    formData.set("financingTracker1YearPrice", form.financingTracker1YearPrice);
    formData.set("financingTracker2YearPrice", form.financingTracker2YearPrice);

    startTransition(async () => {
      if (mode === "create") {
        const result = await createVehicleAction(formData);
        if (result.error || !result.id) {
          setFormError(result.error ?? "Failed to create vehicle.");
          return;
        }

        // createVehicleAction always inserts as DRAFT — the Status field
        // above is a separate, explicit choice, applied via the same
        // updateVehicleStatusAction the vehicle list's status dropdown
        // uses, so it goes through the same "publishing requires an
        // APPROVED showroom" server-side check either way.
        if (form.status !== "DRAFT") {
          const statusResult = await updateVehicleStatusAction(result.id, form.status);
          if (statusResult.error) {
            toast.error(`Vehicle created, but: ${statusResult.error}`);
            router.push(`/dashboard/vehicles/${result.id}/edit`);
            return;
          }
        }
        toast.success("Vehicle created.");
        router.push(`/dashboard/vehicles/${result.id}/edit`);
        return;
      }

      const result = await updateVehicleAction(vehicleId!, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }

      if (initialValues && form.status !== initialValues.status) {
        const statusResult = await updateVehicleStatusAction(vehicleId!, form.status);
        if (statusResult.error) {
          toast.error(statusResult.error);
          return;
        }
      }
      toast.success("Vehicle updated.");
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-neutral-900">Basic information</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="vehicle-title">Title</FieldLabel>
            <Input
              id="vehicle-title"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              onBlur={(e) => validate("title", e.target.value)}
              placeholder="e.g. 2019 Toyota Camry SE"
              autoFocus
              required
              error={!!errorFor("title")}
            />
            {errorFor("title") && <p className="mt-1 text-sm text-red-600">{errorFor("title")}</p>}
          </div>

          <div className="sm:col-span-2">
            <FieldLabel htmlFor="vehicle-status">Status</FieldLabel>
            <select
              id="vehicle-status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value as VehicleStatus)}
              className={`${selectClassName} w-full sm:w-64`}
            >
              {OWNER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-400">
              {mode === "create"
                ? "Vehicles start as Draft — publish here once you're ready, or later from the vehicle list."
                : "Publishing requires your showroom to be approved."}
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-brand">Brand</FieldLabel>
            <select id="vehicle-brand" value={form.brandId} onChange={(e) => handleBrandChange(e.target.value)} className={`${selectClassName} w-full`}>
              <option value="">Select brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            {!form.brandId && form.make && <p className="mt-1 text-xs text-neutral-400">Current value: {form.make} (not in the catalog)</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-model">Model</FieldLabel>
            <select
              id="vehicle-model"
              value={form.model}
              onChange={(e) => setField("model", e.target.value)}
              disabled={!form.brandId}
              className={`${selectClassName} w-full disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">{form.brandId ? "Select model" : "Select a brand first"}</option>
              {modelsForBrand.map((model) => (
                <option key={model.id} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
            {!form.brandId && form.model && <p className="mt-1 text-xs text-neutral-400">Current value: {form.model} (not in the catalog)</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-variant">Variant (optional)</FieldLabel>
            <Input
              id="vehicle-variant"
              value={form.variant}
              onChange={(e) => setField("variant", e.target.value)}
              onBlur={(e) => validate("variant", e.target.value)}
              placeholder="e.g. SE"
              error={!!errorFor("variant")}
            />
            {errorFor("variant") && <p className="mt-1 text-sm text-red-600">{errorFor("variant")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-year">Year</FieldLabel>
            <Input
              id="vehicle-year"
              inputMode="numeric"
              value={form.year}
              onChange={(e) => setField("year", e.target.value)}
              onBlur={(e) => validate("year", e.target.value)}
              placeholder="e.g. 2019"
              required
              error={!!errorFor("year")}
            />
            {errorFor("year") && <p className="mt-1 text-sm text-red-600">{errorFor("year")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-price">Price (KES)</FieldLabel>
            <Input
              id="vehicle-price"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              onBlur={(e) => validate("price", e.target.value)}
              placeholder="e.g. 2500000"
              required
              error={!!errorFor("price")}
            />
            {errorFor("price") && <p className="mt-1 text-sm text-red-600">{errorFor("price")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-mileage">Mileage, km (optional)</FieldLabel>
            <Input
              id="vehicle-mileage"
              inputMode="numeric"
              value={form.mileage}
              onChange={(e) => setField("mileage", e.target.value)}
              onBlur={(e) => validate("mileage", e.target.value)}
              placeholder="e.g. 45000"
              error={!!errorFor("mileage")}
            />
            {errorFor("mileage") && <p className="mt-1 text-sm text-red-600">{errorFor("mileage")}</p>}
          </div>

          <div className="sm:col-span-2">
            <FieldLabel htmlFor="vehicle-description">Description (optional)</FieldLabel>
            <textarea
              id="vehicle-description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              onBlur={(e) => validate("description", e.target.value)}
              rows={4}
              placeholder="Condition, service history, notable features…"
              className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand ${errorFor("description") ? "border-red-400" : "border-neutral-300"}`}
            />
            {errorFor("description") && <p className="mt-1 text-sm text-red-600">{errorFor("description")}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-neutral-900">Specifications</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel htmlFor="vehicle-body-type">Body type (optional)</FieldLabel>
            <select id="vehicle-body-type" value={form.bodyType} onChange={(e) => setField("bodyType", e.target.value)} className={`${selectClassName} w-full`}>
              <option value="">Select body type</option>
              {bodyTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-engine">Engine (optional)</FieldLabel>
            <Input
              id="vehicle-engine"
              value={form.engine}
              onChange={(e) => setField("engine", e.target.value)}
              onBlur={(e) => validate("engine", e.target.value)}
              placeholder="e.g. 2.0L Turbo Petrol"
              error={!!errorFor("engine")}
            />
            {errorFor("engine") && <p className="mt-1 text-sm text-red-600">{errorFor("engine")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-transmission">Transmission (optional)</FieldLabel>
            <select
              id="vehicle-transmission"
              value={form.transmission}
              onChange={(e) => setField("transmission", e.target.value)}
              className={`${selectClassName} w-full`}
            >
              <option value="">Select transmission</option>
              {TRANSMISSIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-fuel-type">Fuel type (optional)</FieldLabel>
            <select id="vehicle-fuel-type" value={form.fuelType} onChange={(e) => setField("fuelType", e.target.value)} className={`${selectClassName} w-full`}>
              <option value="">Select fuel type</option>
              {FUEL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-interior">Interior (optional)</FieldLabel>
            <Input
              id="vehicle-interior"
              value={form.interior}
              onChange={(e) => setField("interior", e.target.value)}
              onBlur={(e) => validate("interior", e.target.value)}
              placeholder="e.g. Leather"
              error={!!errorFor("interior")}
            />
            {errorFor("interior") && <p className="mt-1 text-sm text-red-600">{errorFor("interior")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-doors">Doors (optional)</FieldLabel>
            <Input
              id="vehicle-doors"
              inputMode="numeric"
              value={form.doors}
              onChange={(e) => setField("doors", e.target.value)}
              onBlur={(e) => validate("doors", e.target.value)}
              placeholder="e.g. 4"
              error={!!errorFor("doors")}
            />
            {errorFor("doors") && <p className="mt-1 text-sm text-red-600">{errorFor("doors")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-seats">Seats (optional)</FieldLabel>
            <Input
              id="vehicle-seats"
              inputMode="numeric"
              value={form.seats}
              onChange={(e) => setField("seats", e.target.value)}
              onBlur={(e) => validate("seats", e.target.value)}
              placeholder="e.g. 5"
              error={!!errorFor("seats")}
            />
            {errorFor("seats") && <p className="mt-1 text-sm text-red-600">{errorFor("seats")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-color">Colour (optional)</FieldLabel>
            <Input
              id="vehicle-color"
              value={form.color}
              onChange={(e) => setField("color", e.target.value)}
              onBlur={(e) => validate("color", e.target.value)}
              placeholder="e.g. White"
              error={!!errorFor("color")}
            />
            {errorFor("color") && <p className="mt-1 text-sm text-red-600">{errorFor("color")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="vehicle-country-of-origin">Country of origin (optional)</FieldLabel>
            <Input
              id="vehicle-country-of-origin"
              value={form.countryOfOrigin}
              onChange={(e) => setField("countryOfOrigin", e.target.value)}
              onBlur={(e) => validate("countryOfOrigin", e.target.value)}
              placeholder="e.g. Japan"
              error={!!errorFor("countryOfOrigin")}
            />
            {errorFor("countryOfOrigin") && <p className="mt-1 text-sm text-red-600">{errorFor("countryOfOrigin")}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-neutral-900">Financing</h2>
        <p className="mt-0.5 text-sm text-neutral-500">Let customers know how this vehicle can be financed.</p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={form.installmentEnabled}
              onChange={(e) => setField("installmentEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
            />
            Available on installment (HP)
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={form.bankFinanceEnabled}
              onChange={(e) => setField("bankFinanceEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
            />
            Available on bank finance
          </label>
        </div>

        {form.installmentEnabled && (
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="vehicle-down-payment-value">Deposit</FieldLabel>
              <div className="flex gap-2">
                <select
                  aria-label="Deposit type"
                  value={form.financingDownPaymentType}
                  onChange={(e) => setField("financingDownPaymentType", e.target.value as DownPaymentType)}
                  className={`${selectClassName} w-32 shrink-0`}
                >
                  {DOWN_PAYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === "PERCENT" ? "Percent" : "Fixed (KES)"}
                    </option>
                  ))}
                </select>
                {form.financingDownPaymentType === "PERCENT" ? (
                  <Input
                    id="vehicle-down-payment-value"
                    inputMode="decimal"
                    value={form.financingDownPaymentPercent}
                    onChange={(e) => setField("financingDownPaymentPercent", e.target.value)}
                    onBlur={(e) => validate("financingDownPaymentPercent", e.target.value)}
                    placeholder="e.g. 20"
                    error={!!errorFor("financingDownPaymentPercent")}
                    className="min-w-0 flex-1"
                  />
                ) : (
                  <Input
                    id="vehicle-down-payment-value"
                    inputMode="decimal"
                    value={form.financingDownPaymentAmount}
                    onChange={(e) => setField("financingDownPaymentAmount", e.target.value)}
                    onBlur={(e) => validate("financingDownPaymentAmount", e.target.value)}
                    placeholder="e.g. 500000"
                    error={!!errorFor("financingDownPaymentAmount")}
                    className="min-w-0 flex-1"
                  />
                )}
              </div>
              {(errorFor("financingDownPaymentPercent") || errorFor("financingDownPaymentAmount")) && (
                <p className="mt-1 text-sm text-red-600">{errorFor("financingDownPaymentPercent") || errorFor("financingDownPaymentAmount")}</p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="vehicle-interest-rate">Interest rate, % per year</FieldLabel>
              <Input
                id="vehicle-interest-rate"
                inputMode="decimal"
                value={form.financingInterestRate}
                onChange={(e) => setField("financingInterestRate", e.target.value)}
                onBlur={(e) => validate("financingInterestRate", e.target.value)}
                placeholder="e.g. 14"
                error={!!errorFor("financingInterestRate")}
              />
              {errorFor("financingInterestRate") && <p className="mt-1 text-sm text-red-600">{errorFor("financingInterestRate")}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="vehicle-insurance-percent">Insurance, % of price</FieldLabel>
              <Input
                id="vehicle-insurance-percent"
                inputMode="decimal"
                value={form.financingInsurancePercent}
                onChange={(e) => setField("financingInsurancePercent", e.target.value)}
                onBlur={(e) => validate("financingInsurancePercent", e.target.value)}
                placeholder="e.g. 3.5"
                error={!!errorFor("financingInsurancePercent")}
              />
              {errorFor("financingInsurancePercent") && <p className="mt-1 text-sm text-red-600">{errorFor("financingInsurancePercent")}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="vehicle-tracker-1yr">Tracker fee — 1 year (KES, optional)</FieldLabel>
              <Input
                id="vehicle-tracker-1yr"
                inputMode="decimal"
                value={form.financingTracker1YearPrice}
                onChange={(e) => setField("financingTracker1YearPrice", e.target.value)}
                onBlur={(e) => validate("financingTracker1YearPrice", e.target.value)}
                placeholder="e.g. 15000"
                error={!!errorFor("financingTracker1YearPrice")}
              />
              {errorFor("financingTracker1YearPrice") && <p className="mt-1 text-sm text-red-600">{errorFor("financingTracker1YearPrice")}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="vehicle-tracker-2yr">Tracker fee — 2 years (KES, optional)</FieldLabel>
              <Input
                id="vehicle-tracker-2yr"
                inputMode="decimal"
                value={form.financingTracker2YearPrice}
                onChange={(e) => setField("financingTracker2YearPrice", e.target.value)}
                onBlur={(e) => validate("financingTracker2YearPrice", e.target.value)}
                placeholder="e.g. 28000"
                error={!!errorFor("financingTracker2YearPrice")}
              />
              {errorFor("financingTracker2YearPrice") && <p className="mt-1 text-sm text-red-600">{errorFor("financingTracker2YearPrice")}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="vehicle-financing-partner">Financing partner (optional)</FieldLabel>
              <Input
                id="vehicle-financing-partner"
                value={form.financingPartner}
                onChange={(e) => setField("financingPartner", e.target.value)}
                onBlur={(e) => validate("financingPartner", e.target.value)}
                placeholder="e.g. KCB Bank"
                error={!!errorFor("financingPartner")}
              />
              {errorFor("financingPartner") && <p className="mt-1 text-sm text-red-600">{errorFor("financingPartner")}</p>}
            </div>

            <div className="sm:col-span-3">
              <FieldLabel htmlFor="vehicle-tenure-12">Loan term (optional)</FieldLabel>
              <div className="flex flex-wrap gap-3">
                {LOAN_TENURE_OPTIONS_MONTHS.map((months) => (
                  <label key={months} className="flex items-center gap-1.5 text-sm text-neutral-700">
                    <input
                      id={`vehicle-tenure-${months}`}
                      type="checkbox"
                      checked={form.financingTenureMonths.includes(String(months))}
                      onChange={() => toggleTenure(months)}
                      className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                    />
                    {months} months
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Plain end-of-page actions, not sticky — this form lives on its own
          page now (not a dialog with its own internal scroll), so a
          position:sticky footer follows the *viewport* while the page
          scrolls and ends up overlapping whatever section is currently
          underneath it (confirmed live: it sat on top of Specifications'
          Body Type/Engine/Transmission row and the Deposit input). */}
      <div className="border-t border-neutral-200 pt-4">
        <DialogFormActions
          pending={pending}
          submitLabel={mode === "create" ? "Create vehicle" : "Save changes"}
          onCancel={() => router.push("/dashboard/vehicles")}
        />
      </div>
    </form>
  );
}
