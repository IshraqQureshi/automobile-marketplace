"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DialogFormActions,
  FieldLabel,
  FilterBar,
  PencilIcon,
  RowIconButton,
  SearchInput,
  SectionHeader,
  TableEmptyState,
  TableShell,
  TrashIcon,
  filterSelectClassName,
} from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import {
  createSubscriptionPaymentAction,
  sendSubscriptionRemindersNowAction,
  updateSubscriptionPaymentAction,
  voidSubscriptionPaymentAction,
} from "@/features/admin/payment-actions";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, subscriptionPaymentFieldSchemas } from "@/features/admin/payment-schemas";
import { computeSubscriptionUrgency, type SubscriptionPaymentListItem, type SubscriptionUrgency } from "@/features/admin/payment-queries";
import { currencyFormatter } from "@/features/vehicle/types";

export interface PaymentListShowroomOption {
  id: string;
  businessName: string;
}

interface PaymentListProps {
  payments: SubscriptionPaymentListItem[];
  showrooms: PaymentListShowroomOption[];
}

const dateFormatter = new Intl.DateTimeFormat("en-KE", { year: "numeric", month: "short", day: "numeric" });

const URGENCY_LABELS: Record<SubscriptionUrgency, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  OVERDUE: "Overdue",
};

const URGENCY_BADGE_CLASSES: Record<SubscriptionUrgency, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  EXPIRING_SOON: "bg-amber-50 text-amber-700",
  OVERDUE: "bg-red-50 text-red-700",
};

export function PaymentList({ payments, showrooms }: PaymentListProps) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [remindersPending, setRemindersPending] = useState(false);
  const [voidTarget, setVoidTarget] = useState<SubscriptionPaymentListItem | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<"ALL" | SubscriptionUrgency>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RECORDED" | "VOIDED">("ALL");

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingPayment, setEditingPayment] = useState<SubscriptionPaymentListItem | null>(null);
  const [showroomId, setShowroomId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("MPESA");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { validate, errorFor, reset: resetValidation } = useFieldValidation(subscriptionPaymentFieldSchemas);

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return payments.filter((payment) => {
      if (statusFilter !== "ALL" && payment.status !== statusFilter) return false;
      const urgency = computeSubscriptionUrgency(payment.endDate);
      if (urgencyFilter !== "ALL" && urgency !== urgencyFilter) return false;
      if (!query) return true;
      return payment.showroomName.toLowerCase().includes(query);
    });
  }, [payments, searchQuery, urgencyFilter, statusFilter]);

  function openCreate() {
    setDialogMode("create");
    setEditingPayment(null);
    setShowroomId(showrooms[0]?.id ?? "");
    setAmount("");
    setPaymentMethod("MPESA");
    setReference("");
    setNotes("");
    setStartDate("");
    setEndDate("");
    setFormError(null);
    resetValidation();
  }

  function openEdit(payment: SubscriptionPaymentListItem) {
    setDialogMode("edit");
    setEditingPayment(payment);
    setShowroomId(payment.showroomId);
    setAmount(String(payment.amount));
    setPaymentMethod(payment.paymentMethod);
    setReference(payment.reference ?? "");
    setNotes(payment.notes ?? "");
    setStartDate(payment.startDate);
    setEndDate(payment.endDate);
    setFormError(null);
    resetValidation();
  }

  function closeDialog() {
    setDialogMode(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const amountResult = subscriptionPaymentFieldSchemas.amount.safeParse(amount);
    const startResult = subscriptionPaymentFieldSchemas.startDate.safeParse(startDate);
    const endResult = subscriptionPaymentFieldSchemas.endDate.safeParse(endDate);
    if (!amountResult.success || !startResult.success || !endResult.success) {
      validate("amount", amount);
      validate("startDate", startDate);
      validate("endDate", endDate);
      return;
    }
    if (endResult.data < startResult.data) {
      setFormError("End date must be on or after the start date.");
      return;
    }
    if (!editingPayment && !showroomId) {
      setFormError("Choose a showroom.");
      return;
    }

    setPending(true);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("amount", amount);
      formData.set("paymentMethod", paymentMethod);
      formData.set("reference", reference);
      formData.set("notes", notes);
      formData.set("startDate", startDate);
      formData.set("endDate", endDate);

      let result: { error?: string };
      if (editingPayment) {
        result = await updateSubscriptionPaymentAction(editingPayment.id, formData);
      } else {
        formData.set("showroomId", showroomId);
        result = await createSubscriptionPaymentAction(formData);
      }

      setPending(false);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success(editingPayment ? "Payment updated." : "Payment recorded.");
      closeDialog();
    });
  }

  function handleVoid() {
    if (!voidTarget) return;
    setPending(true);
    startTransition(async () => {
      const result = await voidSubscriptionPaymentAction(voidTarget.id);
      setPending(false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Payment voided.");
      }
      setVoidTarget(null);
    });
  }

  function handleSendRemindersNow() {
    setRemindersPending(true);
    startTransition(async () => {
      const result = await sendSubscriptionRemindersNowAction();
      setRemindersPending(false);
      if (result.error) {
        toast.error(result.error);
      } else if (!result.remindersSent) {
        toast.success("No subscriptions are currently due — nothing to send.");
      } else {
        toast.success(`Sent ${result.remindersSent} reminder${result.remindersSent === 1 ? "" : "s"}.`);
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          icon={<PaymentIcon />}
          title="Payments"
          description="Manually record showroom subscription payments and track upcoming renewals."
          actionLabel="New payment"
          onAction={openCreate}
        />
        <button
          type="button"
          onClick={handleSendRemindersNow}
          disabled={remindersPending}
          className="shrink-0 rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {remindersPending ? "Sending…" : "Send reminders now"}
        </button>
      </div>

      {payments.length > 0 && (
        <FilterBar>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search showroom…" />
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as typeof urgencyFilter)}
            className={`${filterSelectClassName} w-40`}
            aria-label="Filter by due status"
          >
            <option value="ALL">All due statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring soon</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={`${filterSelectClassName} w-36`}
            aria-label="Filter by record status"
          >
            <option value="ALL">All records</option>
            <option value="RECORDED">Recorded</option>
            <option value="VOIDED">Voided</option>
          </select>
        </FilterBar>
      )}

      <TableShell>
        {payments.length === 0 ? (
          <TableEmptyState message="No payments recorded yet." />
        ) : filteredPayments.length === 0 ? (
          <TableEmptyState message="No payments match your search." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Showroom</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Period</th>
                <th className="px-5 py-3 font-semibold">Due status</th>
                <th className="px-5 py-3 font-semibold">Record</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const urgency = computeSubscriptionUrgency(payment.endDate);
                const voided = payment.status === "VOIDED";
                return (
                  <tr key={payment.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                    <td className="px-5 py-3 font-medium text-neutral-800">{payment.showroomName}</td>
                    <td className="px-5 py-3 tabular-nums text-neutral-800">
                      {currencyFormatter.format(payment.amount)}
                      <span className="ml-1.5 text-xs font-normal text-neutral-400">{PAYMENT_METHOD_LABELS[payment.paymentMethod]}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-neutral-600">
                      {dateFormatter.format(new Date(`${payment.startDate}T00:00:00`))} – {dateFormatter.format(new Date(`${payment.endDate}T00:00:00`))}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${voided ? "bg-neutral-100 text-neutral-400" : URGENCY_BADGE_CLASSES[urgency]}`}>
                        {voided ? "—" : URGENCY_LABELS[urgency]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${voided ? "bg-neutral-100 text-neutral-500" : "bg-blue-50 text-blue-700"}`}>
                        {voided ? "Voided" : "Recorded"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <RowIconButton label="Edit" onClick={() => openEdit(payment)} disabled={voided}>
                          <PencilIcon />
                        </RowIconButton>
                        <RowIconButton label="Void" onClick={() => setVoidTarget(payment)} disabled={voided} variant="danger">
                          <TrashIcon />
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

      <ConfirmDialog
        open={voidTarget != null}
        title="Void this payment?"
        description={voidTarget ? `Void the ${currencyFormatter.format(voidTarget.amount)} payment recorded for ${voidTarget.showroomName}? Voided payments are kept for the record but no longer count toward its subscription status.` : ""}
        confirmLabel="Void"
        pending={pending}
        onConfirm={handleVoid}
        onCancel={() => setVoidTarget(null)}
      />

      <Dialog open={dialogMode !== null} onClose={closeDialog} title={editingPayment ? "Edit Payment" : "New Payment"}>
        <form onSubmit={handleSubmit} noValidate>
          {formError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          {!editingPayment && (
            <div className="mb-3">
              <FieldLabel htmlFor="payment-showroom">Showroom</FieldLabel>
              <select
                id="payment-showroom"
                value={showroomId}
                onChange={(e) => setShowroomId(e.target.value)}
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                {showrooms.length === 0 ? (
                  <option value="">No showrooms found</option>
                ) : (
                  showrooms.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.businessName}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <FieldLabel htmlFor="payment-amount">Amount (KES)</FieldLabel>
          <Input
            id="payment-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={(e) => validate("amount", e.target.value)}
            inputMode="decimal"
            autoFocus
            required
            error={!!errorFor("amount")}
          />
          {errorFor("amount") && <p className="mt-1 text-sm text-red-600">{errorFor("amount")}</p>}

          <div className="mt-3">
            <FieldLabel htmlFor="payment-method">Payment method</FieldLabel>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="payment-start-date">Period start</FieldLabel>
              <Input
                id="payment-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={(e) => validate("startDate", e.target.value)}
                required
                error={!!errorFor("startDate")}
              />
              {errorFor("startDate") && <p className="mt-1 text-sm text-red-600">{errorFor("startDate")}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="payment-end-date">Period end</FieldLabel>
              <Input
                id="payment-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onBlur={(e) => validate("endDate", e.target.value)}
                required
                error={!!errorFor("endDate")}
              />
              {errorFor("endDate") && <p className="mt-1 text-sm text-red-600">{errorFor("endDate")}</p>}
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel htmlFor="payment-reference">Reference (optional)</FieldLabel>
            <Input id="payment-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. M-Pesa code" />
          </div>

          <div className="mt-3">
            <FieldLabel htmlFor="payment-notes">Notes (optional)</FieldLabel>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="mt-4">
            <DialogFormActions pending={pending} submitLabel={editingPayment ? "Save changes" : "Record payment"} onCancel={closeDialog} />
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
