"use client";

import { useState, useTransition } from "react";
import { FieldLabel } from "@/components/admin/admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { recordVehicleCommissionAction } from "@/features/admin/commission-actions";

export interface VehicleCommission {
  amount: number;
  status: "PENDING" | "PAID";
  notes: string | null;
}

// Minimal shape rather than the full VehicleWithShowroom — this dialog only
// ever needs an id (to record against) and a title (to show in the dialog
// description), so both its callers (the vehicle moderation list, and the
// admin Payments page's own commission entry list) can pass in whatever
// row shape they already have without adapting it to a heavier type.
export interface CommissionDialogVehicle {
  id: string;
  title: string;
}

interface CommissionDialogProps {
  vehicle: CommissionDialogVehicle;
  existing: VehicleCommission | null;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Shared between the vehicle moderation list (/admin/vehicles, "Commission"
 * column on a SOLD row) and the admin Payments page's own "Vehicle
 * commissions" section (/admin/payments) — same underlying
 * recordVehicleCommissionAction upsert either way, just reached from two
 * different entry points.
 */
export function CommissionDialog({ vehicle, existing, onClose, onSaved }: CommissionDialogProps) {
  const toast = useToast();
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [status, setStatus] = useState<"PENDING" | "PAID">(existing?.status ?? "PENDING");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicle.id);
      formData.set("amount", amount);
      formData.set("status", status);
      formData.set("notes", notes);
      const result = await recordVehicleCommissionAction(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Commission saved.");
      onSaved?.();
      onClose();
    });
  }

  return (
    <Dialog open onClose={onClose} title="Commission" description={vehicle.title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        <div>
          <FieldLabel htmlFor="commission-amount">Commission amount (KES)</FieldLabel>
          <Input id="commission-amount" type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="commission-status">Payment status</FieldLabel>
          <select
            id="commission-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "PENDING" | "PAID")}
            className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="commission-notes">Notes (optional)</FieldLabel>
          <textarea
            id="commission-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
