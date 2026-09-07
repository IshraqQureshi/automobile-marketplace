"use client";

import { useMemo, useState, useTransition } from "react";
import { FieldLabel } from "@/components/admin/admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { getAvailableSlotsAction, submitAppointmentAction } from "@/features/appointment/actions";
import { appointmentFieldSchemas } from "@/features/appointment/schemas";
import type { TimeSlot } from "@/features/appointment/slots";
import { stripKenyaPrefix } from "@/lib/validation/kenya-phone";

export interface ScheduleTestDriveInitialValues {
  fullName: string;
  email: string;
  phone: string;
}

export interface OtherShowroomVehicle {
  id: string;
  title: string;
}

interface ScheduleTestDriveButtonProps {
  vehicleId: string;
  vehicleTitle: string;
  showroomId: string;
  showroomName: string;
  availableDaysOfWeek: number[];
  otherVehicles: OtherShowroomVehicle[];
  initialValues: ScheduleTestDriveInitialValues | null;
}

const FORM_FIELD_SCHEMAS = appointmentFieldSchemas;
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatSlotLabel(startTime: string): string {
  return new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(`2000-01-01T${startTime}`));
}

/**
 * Real "Schedule Test Drive" flow (previously a disabled placeholder) —
 * a 3-step dialog: pick a date → pick an open time slot (fetched fresh
 * from the server, since it depends on live already-booked appointments,
 * not just static config) → confirm vehicles + contact info + submit.
 * Only rendered when the showroom has at least one open day configured
 * (see the caller in [brand]/[slug]/page.tsx) — same conditional-render
 * precedent as FinancingApplicationButton.
 */
export function ScheduleTestDriveButton({
  vehicleId,
  vehicleTitle,
  showroomId,
  showroomName,
  availableDaysOfWeek,
  otherVehicles,
  initialValues,
}: ScheduleTestDriveButtonProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 3>(1);
  const [submitted, setSubmitted] = useState<string | null>(null); // booking reference once submitted

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);

  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([vehicleId]);
  const [name, setName] = useState(initialValues?.fullName ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [phone, setPhone] = useState(initialValues ? stripKenyaPrefix(initialValues.phone) : "");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const { validate, errorFor: liveErrorFor, reset } = useFieldValidation(FORM_FIELD_SCHEMAS);

  function errorFor(field: keyof typeof FORM_FIELD_SCHEMAS) {
    return liveErrorFor(field, serverFieldErrors[field]);
  }

  function openDialog() {
    setStep(1);
    setSubmitted(null);
    setSelectedDate(null);
    setSlots([]);
    setSelectedStartTime(null);
    setSelectedVehicleIds([vehicleId]);
    setNotes("");
    setFormError(null);
    setServerFieldErrors({});
    reset();
    setOpen(true);
  }

  async function pickDate(date: Date) {
    const dateString = toDateString(date);
    setSelectedDate(dateString);
    setSelectedStartTime(null);
    setSlotsError(null);
    setSlotsLoading(true);
    const result = await getAvailableSlotsAction(showroomId, dateString);
    setSlotsLoading(false);
    if (result.error) {
      setSlotsError(result.error);
      setSlots([]);
      return;
    }
    setSlots(result.slots);
  }

  function pickSlot(startTime: string) {
    setSelectedStartTime(startTime);
    setStep(3);
  }

  function toggleVehicle(id: string) {
    setSelectedVehicleIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!selectedDate || !selectedStartTime) {
      setFormError("Choose a date and time slot first.");
      return;
    }

    let hasError = false;
    for (const [field, value] of [
      ["name", name],
      ["email", email],
      ["phone", phone],
      ["appointmentDate", selectedDate],
      ["startTime", selectedStartTime],
      ["notes", notes],
    ] as const) {
      if (!FORM_FIELD_SCHEMAS[field].safeParse(value).success) {
        validate(field, value);
        hasError = true;
      }
    }
    if (selectedVehicleIds.length === 0) {
      setFormError("Select at least one vehicle.");
      hasError = true;
    }
    if (hasError) return;

    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("phone", phone);
    formData.set("appointmentDate", selectedDate);
    formData.set("startTime", selectedStartTime);
    formData.set("notes", notes);
    for (const id of selectedVehicleIds) formData.append("vehicleIds", id);

    startTransition(async () => {
      const result = await submitAppointmentAction(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      if (result.fieldErrors) {
        setServerFieldErrors(result.fieldErrors);
        setFormError("Please fix the errors below and try again.");
        return;
      }
      setSubmitted(result.bookingReference ?? null);
    });
  }

  const calendarDays = useMemo(() => buildCalendarGrid(viewMonth), [viewMonth]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex w-full items-center justify-center gap-2 rounded-[7px] border border-neutral-300 bg-white py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
      >
        <CalendarIcon />
        Schedule Test Drive
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Schedule Test Drive" description={vehicleTitle} size="lg">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0fdf9] text-brand">
              <CheckIcon />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Request sent!</p>
            <p className="text-sm text-neutral-500">
              Booking reference <strong>{submitted}</strong>. {showroomName} has been notified and will confirm your appointment by email shortly.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <StepIndicator step={step} />

            {step === 1 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewMonth((m) => addMonths(m, -1))}
                    aria-label="Previous month"
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
                  >
                    ‹
                  </button>
                  <p className="text-sm font-semibold text-neutral-900">
                    {new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric" }).format(viewMonth)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMonth((m) => addMonths(m, 1))}
                    aria-label="Next month"
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400">
                  {DAY_LABELS.map((label, i) => (
                    <span key={i}>{label}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {calendarDays.map((date, i) => {
                    if (!date) return <span key={i} />;
                    const isPast = date < today;
                    const dayOfWeek = date.getDay();
                    const isOpenDay = availableDaysOfWeek.includes(dayOfWeek);
                    const disabled = isPast || !isOpenDay;
                    const isSelected = selectedDate === toDateString(date);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => pickDate(date)}
                        className={`aspect-square rounded-md text-sm ${
                          isSelected
                            ? "bg-brand text-white"
                            : disabled
                              ? "cursor-not-allowed text-neutral-300"
                              : "text-neutral-700 hover:bg-brand/10"
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
                {availableDaysOfWeek.length === 0 && (
                  <p className="mt-3 text-sm text-neutral-500">This showroom hasn&apos;t set their availability yet.</p>
                )}

                {selectedDate && (
                  <div className="mt-5 border-t border-neutral-100 pt-4">
                    <p className="mb-2 text-sm font-medium text-neutral-700">Available times</p>
                    {slotsLoading ? (
                      <p className="text-sm text-neutral-400">Loading times…</p>
                    ) : slotsError ? (
                      <p className="text-sm text-red-600">{slotsError}</p>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-neutral-400">No open times on this date. Try another day.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((slot) => (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={slot.booked}
                            onClick={() => pickSlot(slot.startTime)}
                            className={`rounded-md border px-2 py-2 text-sm ${
                              slot.booked
                                ? "cursor-not-allowed border-neutral-200 text-neutral-300 line-through"
                                : "border-neutral-300 text-neutral-700 hover:border-brand hover:text-brand"
                            }`}
                          >
                            {formatSlotLabel(slot.startTime)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && selectedDate && selectedStartTime && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <button type="button" onClick={() => setStep(1)} className="self-start text-xs font-medium text-neutral-500 hover:text-neutral-700">
                  ← Change date/time
                </button>

                <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                  {new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${selectedDate}T00:00:00`))} at{" "}
                  {formatSlotLabel(selectedStartTime)}
                </div>

                {otherVehicles.length > 0 && (
                  <div>
                    <FieldLabel htmlFor="vehicle-list">Vehicles for this appointment</FieldLabel>
                    <div id="vehicle-list" className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 text-sm text-neutral-700">
                        <input type="checkbox" checked disabled />
                        {vehicleTitle}
                      </label>
                      {otherVehicles.map((v) => (
                        <label key={v.id} className="flex items-center gap-2 text-sm text-neutral-700">
                          <input type="checkbox" checked={selectedVehicleIds.includes(v.id)} onChange={() => toggleVehicle(v.id)} />
                          {v.title}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="appointment-name">Full Name</FieldLabel>
                    <Input
                      id="appointment-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={(e) => validate("name", e.target.value)}
                      placeholder="Jane Wanjiru"
                      error={!!errorFor("name")}
                    />
                    {errorFor("name") && <p className="mt-1 text-sm text-red-600">{errorFor("name")}</p>}
                  </div>

                  <div>
                    <FieldLabel htmlFor="appointment-email">Email</FieldLabel>
                    <Input
                      id="appointment-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={(e) => validate("email", e.target.value)}
                      placeholder="jane@example.com"
                      error={!!errorFor("email")}
                    />
                    {errorFor("email") && <p className="mt-1 text-sm text-red-600">{errorFor("email")}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="appointment-phone">Phone</FieldLabel>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">+254</span>
                      <Input
                        id="appointment-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={(e) => validate("phone", e.target.value)}
                        placeholder="712345678"
                        error={!!errorFor("phone")}
                      />
                    </div>
                    {errorFor("phone") && <p className="mt-1 text-sm text-red-600">{errorFor("phone")}</p>}
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="appointment-notes">Notes (optional)</FieldLabel>
                  <textarea
                    id="appointment-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={(e) => validate("notes", e.target.value)}
                    rows={3}
                    placeholder="Anything the showroom should know before your visit…"
                    className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand ${errorFor("notes") ? "border-red-400" : "border-neutral-300"}`}
                  />
                  {errorFor("notes") && <p className="mt-1 text-sm text-red-600">{errorFor("notes")}</p>}
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pending ? "Submitting…" : "Request Appointment"}
                </button>
              </form>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}

function buildCalendarGrid(monthStart: Date): (Date | null)[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  return cells;
}

function addMonths(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function StepIndicator({ step }: { step: 1 | 3 }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
      <span className={step === 1 ? "text-brand" : ""}>1. Pick a date &amp; time</span>
      <span>→</span>
      <span className={step === 3 ? "text-brand" : ""}>2. Your details</span>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
