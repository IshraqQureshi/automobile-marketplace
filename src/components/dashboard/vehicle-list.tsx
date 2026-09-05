"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  CarIcon,
  DialogFormActions,
  FieldLabel,
  PencilIcon,
  RowIconButton,
  SectionHeader,
  TableEmptyState,
  TableShell,
  TrashIcon,
  UploadIcon,
} from "@/components/admin/admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import {
  createVehicleAction,
  deleteVehiclePhotoAction,
  setPrimaryVehiclePhotoAction,
  updateVehicleAction,
  updateVehicleStatusAction,
  uploadVehiclePhotosAction,
} from "@/features/vehicle/actions";
import { FUEL_TYPES, TRANSMISSIONS, vehicleFieldSchemas } from "@/features/vehicle/schemas";

export type VehicleStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SOLD" | "INACTIVE" | "REJECTED";

export interface VehiclePhoto {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface VehicleListItem {
  id: string;
  title: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  price: number;
  mileage: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyType: string | null;
  color: string | null;
  description: string | null;
  status: VehicleStatus;
  photos: VehiclePhoto[];
}

const STATUS_LABELS: Record<VehicleStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  ACTIVE: "Published",
  SOLD: "Sold",
  INACTIVE: "Removed",
  REJECTED: "Rejected",
};

// Owner-settable subset only (mirrors OWNER_SETTABLE_VEHICLE_STATUSES in
// src/features/vehicle/schemas.ts) — PENDING_REVIEW/REJECTED are Day 4 admin
// moderation states an owner can't set directly, so they never appear as a
// selectable option even if a vehicle happened to carry one.
const OWNER_STATUS_OPTIONS: VehicleStatus[] = ["DRAFT", "ACTIVE", "SOLD", "INACTIVE"];

const STATUS_BADGE_CLASSES: Record<VehicleStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-500",
  PENDING_REVIEW: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  SOLD: "bg-blue-50 text-blue-700",
  INACTIVE: "bg-neutral-100 text-neutral-400",
  REJECTED: "bg-red-50 text-red-700",
};

const currencyFormatter = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

interface VehicleFormState {
  title: string;
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
}

const EMPTY_FORM: VehicleFormState = {
  title: "",
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
};

interface VehicleListProps {
  vehicles: VehicleListItem[];
  bodyTypeOptions: string[];
}

export function VehicleList({ vehicles, bodyTypeOptions }: VehicleListProps) {
  const toast = useToast();
  const { validate, errorFor, reset: resetValidation } = useFieldValidation(vehicleFieldSchemas);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [photosVehicle, setPhotosVehicle] = useState<VehicleListItem | null>(null);
  const [pending, startTransition] = useTransition();
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);

  function openCreate() {
    setDialogMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    resetValidation();
  }

  function openEdit(vehicle: VehicleListItem) {
    setDialogMode("edit");
    setEditingId(vehicle.id);
    setForm({
      title: vehicle.title,
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
    });
    setFormError(null);
    resetValidation();
  }

  function closeDialog() {
    setDialogMode(null);
  }

  function setField<K extends keyof VehicleFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    for (const field of ["title", "make", "model", "year", "price", "mileage"] as const) {
      const schema = vehicleFieldSchemas[field];
      if (!schema.safeParse(form[field]).success) {
        validate(field, form[field]);
        hasError = true;
      }
    }
    if (hasError) return;

    const formData = new FormData();
    for (const [key, value] of Object.entries(form)) {
      formData.set(key, value);
    }

    startTransition(async () => {
      const result = editingId ? await updateVehicleAction(editingId, formData) : await createVehicleAction(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success(editingId ? "Vehicle updated." : "Vehicle created as a draft.");
      closeDialog();
    });
  }

  function handleStatusChange(vehicleId: string, status: VehicleStatus) {
    setStatusPendingId(vehicleId);
    startTransition(async () => {
      const result = await updateVehicleStatusAction(vehicleId, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Marked as ${STATUS_LABELS[status].toLowerCase()}.`);
      }
      setStatusPendingId(null);
    });
  }

  return (
    <div>
      <SectionHeader
        icon={<CarIcon />}
        title="Vehicles"
        description="Manage your showroom's vehicle listings."
        actionLabel="New vehicle"
        onAction={openCreate}
      />

      <TableShell>
        {vehicles.length === 0 ? (
          <TableEmptyState message="No vehicles yet. Add your first listing to get started." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                <th className="px-5 py-3 font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
                const primaryPhoto = vehicle.photos.find((p) => p.isPrimary) ?? vehicle.photos[0];
                return (
                  <tr key={vehicle.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100">
                          {primaryPhoto ? (
                            <Image src={primaryPhoto.url} alt="" width={56} height={40} unoptimized className="h-full w-full object-cover" />
                          ) : (
                            <CarIcon />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-800">{vehicle.title}</p>
                          <p className="truncate text-xs text-neutral-400">
                            {vehicle.year} · {vehicle.make} {vehicle.model}
                            {vehicle.variant ? ` ${vehicle.variant}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-neutral-800 tabular-nums">{currencyFormatter.format(vehicle.price)}</td>
                    <td className="px-5 py-3">
                      {OWNER_STATUS_OPTIONS.includes(vehicle.status) ? (
                        <select
                          value={vehicle.status}
                          disabled={statusPendingId === vehicle.id}
                          onChange={(e) => handleStatusChange(vehicle.id, e.target.value as VehicleStatus)}
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold capitalize outline-none disabled:opacity-60 ${STATUS_BADGE_CLASSES[vehicle.status]}`}
                        >
                          {OWNER_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE_CLASSES[vehicle.status]}`}>
                          {STATUS_LABELS[vehicle.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <RowIconButton label="Photos" onClick={() => setPhotosVehicle(vehicle)}>
                          <UploadIcon />
                        </RowIconButton>
                        <RowIconButton label="Edit" onClick={() => openEdit(vehicle)}>
                          <PencilIcon />
                        </RowIconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableShell>

      <Dialog
        open={dialogMode !== null}
        onClose={closeDialog}
        title={editingId ? "Edit vehicle" : "New vehicle"}
        description={editingId ? undefined : "Vehicles are created as drafts — publish when you're ready."}
        size="lg"
      >
        <form onSubmit={handleSubmit} noValidate>
          {formError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div>
              <FieldLabel htmlFor="vehicle-make">Make</FieldLabel>
              <Input
                id="vehicle-make"
                value={form.make}
                onChange={(e) => setField("make", e.target.value)}
                onBlur={(e) => validate("make", e.target.value)}
                placeholder="e.g. Toyota"
                required
                error={!!errorFor("make")}
              />
              {errorFor("make") && <p className="mt-1 text-sm text-red-600">{errorFor("make")}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="vehicle-model">Model</FieldLabel>
              <Input
                id="vehicle-model"
                value={form.model}
                onChange={(e) => setField("model", e.target.value)}
                onBlur={(e) => validate("model", e.target.value)}
                placeholder="e.g. Camry"
                required
                error={!!errorFor("model")}
              />
              {errorFor("model") && <p className="mt-1 text-sm text-red-600">{errorFor("model")}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="vehicle-variant">Variant (optional)</FieldLabel>
              <Input id="vehicle-variant" value={form.variant} onChange={(e) => setField("variant", e.target.value)} placeholder="e.g. SE" />
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

            <div>
              <FieldLabel htmlFor="vehicle-fuel-type">Fuel type (optional)</FieldLabel>
              <select
                id="vehicle-fuel-type"
                value={form.fuelType}
                onChange={(e) => setField("fuelType", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">Select fuel type</option>
                {FUEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="vehicle-transmission">Transmission (optional)</FieldLabel>
              <select
                id="vehicle-transmission"
                value={form.transmission}
                onChange={(e) => setField("transmission", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
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
              <FieldLabel htmlFor="vehicle-body-type">Body type (optional)</FieldLabel>
              <select
                id="vehicle-body-type"
                value={form.bodyType}
                onChange={(e) => setField("bodyType", e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">Select body type</option>
                {bodyTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="vehicle-color">Color (optional)</FieldLabel>
              <Input id="vehicle-color" value={form.color} onChange={(e) => setField("color", e.target.value)} placeholder="e.g. White" />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="vehicle-description">Description (optional)</FieldLabel>
              <textarea
                id="vehicle-description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={4}
                placeholder="Condition, service history, notable features…"
                className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          {/* Sticky, not just mt-4 — this form has far more fields than any
              other dialog in the app (12 vs. a handful), so on an ordinary
              laptop viewport its own content already exceeds the dialog's
              max-h-[90vh] scroll area. Without this, Save/Cancel scroll out
              of view at the bottom of a long, unscrolled dialog — easy to
              miss, and confirmed live: Playwright's real click on an
              off-screen button silently never reached it. */}
          <div className="sticky bottom-0 mt-4 -mx-6 border-t border-neutral-200 bg-white px-6 pt-3 pb-1">
            <DialogFormActions pending={pending} submitLabel={editingId ? "Save changes" : "Create"} onCancel={closeDialog} />
          </div>
        </form>
      </Dialog>

      {photosVehicle && (
        <VehiclePhotosDialog vehicle={photosVehicle} onClose={() => setPhotosVehicle(null)} />
      )}
    </div>
  );
}

interface VehiclePhotosDialogProps {
  vehicle: VehicleListItem;
  onClose: () => void;
}

function VehiclePhotosDialog({ vehicle, onClose }: VehiclePhotosDialogProps) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("photos", file);
    }

    startTransition(async () => {
      const result = await uploadVehiclePhotosAction(vehicle.id, formData);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Photos uploaded.");
      }
      e.target.value = "";
    });
  }

  function handleSetPrimary(mediaId: string) {
    startTransition(async () => {
      const result = await setPrimaryVehiclePhotoAction(mediaId);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete(mediaId: string) {
    startTransition(async () => {
      const result = await deleteVehiclePhotoAction(mediaId);
      if (result.error) toast.error(result.error);
      else toast.success("Photo removed.");
    });
  }

  return (
    <Dialog open onClose={onClose} title={`Photos — ${vehicle.title}`} description="Upload photos, choose the primary listing image, or remove one.">
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {vehicle.photos.length === 0 ? (
        <p className="mb-4 text-sm text-neutral-400">No photos uploaded yet.</p>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vehicle.photos.map((photo) => (
            <div key={photo.id} className="relative overflow-hidden rounded-md border border-neutral-200">
              <Image src={photo.url} alt="" width={200} height={140} unoptimized className="h-24 w-full object-cover" />
              {photo.isPrimary && (
                <span className="absolute top-1 left-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">Primary</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-black/40 p-1">
                {!photo.isPrimary && (
                  <RowIconButton label="Set as primary" onClick={() => handleSetPrimary(photo.id)} disabled={pending} variant="brand">
                    <CheckIconSmall />
                  </RowIconButton>
                )}
                <RowIconButton label="Delete photo" onClick={() => handleDelete(photo.id)} disabled={pending} variant="danger">
                  <TrashIcon />
                </RowIconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <FieldLabel htmlFor="vehicle-photo-upload">Upload photos</FieldLabel>
      <input
        id="vehicle-photo-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={pending}
        onChange={handleUpload}
        className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark"
      />

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          Close
        </button>
      </div>
    </Dialog>
  );
}

function CheckIconSmall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
