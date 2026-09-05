"use client";

import { useState } from "react";
import type { ZodType } from "zod";

/**
 * Per-field validation against the same zod schemas the server action uses
 * — real-time feedback on blur, not a second source of truth. The server
 * action re-validates everything regardless; this only improves UX.
 *
 * Once a field has been touched (blurred at least once), its live result
 * takes over from any stale server-returned error for that field.
 */
export function useFieldValidation<Shape extends Record<string, ZodType>>(shape: Shape) {
  const [touched, setTouched] = useState<Partial<Record<keyof Shape, boolean>>>({});
  const [liveErrors, setLiveErrors] = useState<Partial<Record<keyof Shape, string>>>({});

  function validate(name: keyof Shape, value: string) {
    setTouched((prev) => ({ ...prev, [name]: true }));
    // `name` is always a real key of `shape` by the type contract callers
    // use — noUncheckedIndexedAccess still flags the generic index as
    // possibly undefined, which it structurally can't be here.
    const fieldSchema = shape[name] as Shape[typeof name];
    const result = fieldSchema.safeParse(value);
    setLiveErrors((prev) => ({
      ...prev,
      [name]: result.success ? undefined : (result.error.issues[0]?.message ?? "Invalid value"),
    }));
  }

  function errorFor(name: keyof Shape, serverError?: string) {
    return touched[name] ? liveErrors[name] : serverError;
  }

  // For callers that reuse one hook instance across multiple independent
  // "sessions" of the same form — e.g. a dialog that stays mounted between
  // opens, only toggling its `open` prop — clear touched/liveErrors when a
  // new session starts (opening a fresh create/edit dialog), so a
  // validation error from a previous, already-closed session doesn't
  // reappear before the user has touched anything this time.
  function reset() {
    setTouched({});
    setLiveErrors({});
  }

  return { validate, errorFor, reset };
}
