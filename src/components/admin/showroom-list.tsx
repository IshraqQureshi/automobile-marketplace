"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  DialogFormActions,
  FieldLabel,
  InitialAvatar,
  PencilIcon,
  RowIconButton,
  SectionHeader,
  ShowroomIcon,
  StatusBadge,
  TableEmptyState,
  TableShell,
  TrashIcon,
  UploadIcon,
} from "./admin-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { validateLogoFile } from "@/features/admin/logo-upload";
import { approveShowroomAction, getShowroomDocumentUrlAction, rejectShowroomAction, type ShowroomOwnerCandidate } from "@/features/admin/showroom-actions";
import { adminShowroomSchema, newOwnerFieldSchemas, newOwnerSchema, showroomFieldSchemas } from "@/features/admin/showroom-schemas";
import { stripKenyaPrefix } from "@/lib/validation/kenya-phone";

export interface ShowroomDocumentItem {
  id: string;
  documentType: string;
  storagePath: string;
  status: string;
  createdAt: string;
}

export interface ShowroomListItem {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  city: string | null;
  address: string | null;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  documents: ShowroomDocumentItem[];
  logoUrl: string | null;
}

interface ShowroomListProps {
  items: ShowroomListItem[];
  onCreate: (formData: FormData) => Promise<{ error?: string; warning?: string }>;
  onUpdate: (formData: FormData) => Promise<{ error?: string; warning?: string }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
  onSearchOwners: (query: string) => Promise<{ users: ShowroomOwnerCandidate[] }>;
}

// The only document category the registration form collects today (see
// src/features/showroom/actions.ts's BUSINESS_REGISTRATION_DOCUMENT_TYPE) —
// mapped to a readable label rather than shown as a raw snake_case string.
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  business_registration: "Business Registration",
};

function formatDocumentType(type: string) {
  return DOCUMENT_TYPE_LABELS[type] ?? type;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

// Storage paths keep their original extension (see uploadShowroomDocuments)
// — used to decide how to render an inline preview, without needing to
// store a separate MIME-type column.
function documentKindFromPath(path: string): "pdf" | "image" | "other" {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "webp") return "image";
  return "other";
}

const OWNER_SEARCH_DEBOUNCE_MS = 300;
const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/svg+xml";

interface ShowroomFormState {
  businessName: string;
  location: string;
  businessPhone: string;
  businessEmail: string;
  address: string;
  description: string;
}

const BLANK_FORM: ShowroomFormState = { businessName: "", location: "", businessPhone: "", businessEmail: "", address: "", description: "" };

interface NewOwnerFormState {
  ownerFullName: string;
  ownerEmail: string;
  ownerPhone: string;
}

const BLANK_NEW_OWNER: NewOwnerFormState = { ownerFullName: "", ownerEmail: "", ownerPhone: "" };

interface PreviewingDocument {
  url: string;
  name: string;
  kind: "pdf" | "image" | "other";
}

export function ShowroomList({ items, onCreate, onUpdate, onDelete, onSearchOwners }: ShowroomListProps) {
  const toast = useToast();

  // Approve/reject inside the Review dialog and the create/edit/delete CRUD
  // dialogs are independent transitions — the two dialogs never open at the
  // same time, but keeping them separate avoids one flow's pending state
  // spuriously disabling the other's buttons.
  const [reviewing, setReviewing] = useState<ShowroomListItem | null>(null);
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  // A document preview replaces the review details inline, in the same
  // already-open Dialog, rather than stacking a second portaled modal on
  // top — same reasoning as the approve/reject inline confirmation swap.
  const [previewingDocument, setPreviewingDocument] = useState<PreviewingDocument | null>(null);
  const [reviewPending, startReviewTransition] = useTransition();

  // Real, application-level (zod) validation, not just native HTML5
  // attributes — mirrors register-showroom-form.tsx's use of the same
  // hook against the same schemas: on-blur inline errors here, plus an
  // explicit safeParse in handleSubmit below that blocks the server call
  // entirely for invalid input, rather than relying on the browser's own
  // (bypassable, and not actually a validation guarantee) constraint
  // validation to keep bad data from ever being submitted.
  const { validate: validateField, errorFor: errorForField } = useFieldValidation(showroomFieldSchemas);
  const { validate: validateOwnerField, errorFor: errorForOwnerField } = useFieldValidation(newOwnerFieldSchemas);

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<ShowroomListItem | null>(null);
  const [form, setForm] = useState<ShowroomFormState>(BLANK_FORM);
  const [ownerMode, setOwnerMode] = useState<"existing" | "new">("existing");
  const [selectedOwner, setSelectedOwner] = useState<ShowroomOwnerCandidate | null>(null);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerResults, setOwnerResults] = useState<ShowroomOwnerCandidate[]>([]);
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
  const [newOwner, setNewOwner] = useState<NewOwnerFormState>(BLANK_NEW_OWNER);
  const [documents, setDocuments] = useState<File[]>([]);
  const [documentsInputKey, setDocumentsInputKey] = useState(0);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShowroomListItem | null>(null);
  const [crudPending, startCrudTransition] = useTransition();
  const ownerSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // clearTimeout only cancels a not-yet-fired debounce timer — it doesn't
  // stop two already-in-flight searches from resolving out of order (a
  // slower response for an earlier keystroke landing after a faster one for
  // a later keystroke). Each search call captures the current id; a
  // response is only applied if it's still the latest one requested.
  const ownerSearchRequestId = useRef(0);

  function openReview(item: ShowroomListItem) {
    setReviewing(item);
    setConfirming(null);
    setPreviewingDocument(null);
  }

  function closeReview() {
    setReviewing(null);
    setConfirming(null);
    setPreviewingDocument(null);
  }

  function handleApprove() {
    if (!reviewing) return;
    startReviewTransition(async () => {
      const result = await approveShowroomAction(reviewing.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${reviewing.businessName} approved.`);
        closeReview();
      }
    });
  }

  function handleReject() {
    if (!reviewing) return;
    startReviewTransition(async () => {
      const result = await rejectShowroomAction(reviewing.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${reviewing.businessName} rejected.`);
        closeReview();
      }
    });
  }

  async function handleViewDocument(doc: ShowroomDocumentItem) {
    setOpeningDocumentId(doc.id);
    const result = await getShowroomDocumentUrlAction(doc.storagePath);
    setOpeningDocumentId(null);
    if (result.error || !result.url) {
      toast.error(result.error ?? "Failed to open document.");
      return;
    }
    setPreviewingDocument({ url: result.url, name: formatDocumentType(doc.documentType), kind: documentKindFromPath(doc.storagePath) });
  }

  function openCreate() {
    setDialogMode("create");
    setEditingItem(null);
    setForm(BLANK_FORM);
    setOwnerMode("existing");
    setSelectedOwner(null);
    setOwnerQuery("");
    setOwnerResults([]);
    setNewOwner(BLANK_NEW_OWNER);
    setDocuments([]);
    setDocumentsInputKey((k) => k + 1);
    setLogo(null);
    setRemoveLogo(false);
    setLogoInputKey((k) => k + 1);
    setFormError(null);
  }

  function openEdit(item: ShowroomListItem) {
    setDialogMode("edit");
    setEditingItem(item);
    setForm({
      businessName: item.businessName,
      location: item.city ?? "",
      businessPhone: stripKenyaPrefix(item.phone),
      businessEmail: item.email,
      address: item.address ?? "",
      description: item.description ?? "",
    });
    setOwnerMode("existing");
    setSelectedOwner(null);
    setOwnerQuery("");
    setOwnerResults([]);
    setNewOwner(BLANK_NEW_OWNER);
    setDocuments([]);
    setDocumentsInputKey((k) => k + 1);
    setLogo(null);
    setRemoveLogo(false);
    setLogoInputKey((k) => k + 1);
    setFormError(null);
  }

  function closeDialog() {
    setDialogMode(null);
    if (ownerSearchDebounce.current) clearTimeout(ownerSearchDebounce.current);
  }

  function handleOwnerQueryChange(value: string) {
    setOwnerQuery(value);
    setSelectedOwner(null);
    if (ownerSearchDebounce.current) clearTimeout(ownerSearchDebounce.current);
    if (value.trim().length < 2) {
      ownerSearchRequestId.current += 1;
      setOwnerResults([]);
      setOwnerSearchLoading(false);
      return;
    }
    setOwnerSearchLoading(true);
    const requestId = ++ownerSearchRequestId.current;
    ownerSearchDebounce.current = setTimeout(async () => {
      const result = await onSearchOwners(value);
      if (requestId !== ownerSearchRequestId.current) return;
      setOwnerResults(result.users);
      setOwnerSearchLoading(false);
    }, OWNER_SEARCH_DEBOUNCE_MS);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Real zod validation against the exact same schemas the server action
    // uses — not just the browser's native `required`/`type=email`
    // constraint validation, which a user can trivially bypass (e.g. via
    // devtools) and which isn't itself a source of truth. This blocks the
    // network call entirely for invalid input; the server independently
    // re-validates everything regardless, same as every other form in
    // this app that uses useFieldValidation.
    const businessParsed = adminShowroomSchema.safeParse({
      businessName: form.businessName,
      location: form.location,
      businessPhone: form.businessPhone,
      businessEmail: form.businessEmail,
      address: form.address,
      description: form.description,
    });
    if (!businessParsed.success) {
      for (const field of Object.keys(showroomFieldSchemas) as (keyof typeof showroomFieldSchemas)[]) {
        validateField(field, form[field as keyof ShowroomFormState] ?? "");
      }
      setFormError(businessParsed.error.issues[0]?.message ?? "Please fix the errors below.");
      return;
    }

    if (logo) {
      const logoError = validateLogoFile(logo);
      if (logoError) {
        setFormError(logoError);
        return;
      }
    }

    if (!editingItem) {
      if (ownerMode === "existing" && !selectedOwner) {
        setFormError("Choose an owner for this showroom.");
        return;
      }
      if (ownerMode === "new") {
        const ownerParsed = newOwnerSchema.safeParse(newOwner);
        if (!ownerParsed.success) {
          for (const field of Object.keys(newOwnerFieldSchemas) as (keyof typeof newOwnerFieldSchemas)[]) {
            validateOwnerField(field, newOwner[field]);
          }
          setFormError(ownerParsed.error.issues[0]?.message ?? "Please fix the new owner's details below.");
          return;
        }
      }
    }

    startCrudTransition(async () => {
      const formData = new FormData();
      formData.set("businessName", form.businessName);
      formData.set("location", form.location);
      formData.set("businessPhone", form.businessPhone);
      formData.set("businessEmail", form.businessEmail);
      formData.set("address", form.address);
      formData.set("description", form.description);
      if (logo) formData.set("logo", logo);
      if (editingItem) {
        formData.set("id", editingItem.id);
        if (removeLogo) formData.set("removeLogo", "true");
      } else if (ownerMode === "new") {
        formData.set("ownerMode", "new");
        formData.set("ownerFullName", newOwner.ownerFullName);
        formData.set("ownerEmail", newOwner.ownerEmail);
        formData.set("ownerPhone", newOwner.ownerPhone);
      } else if (selectedOwner) {
        formData.set("ownerUserId", selectedOwner.id);
      }
      if (!editingItem) {
        for (const file of documents) formData.append("documents", file);
      }
      const result = editingItem ? await onUpdate(formData) : await onCreate(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success(editingItem ? "Showroom updated." : "Showroom created.");
      if (result.warning) toast.error(result.warning);
      setDialogMode(null);
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startCrudTransition(async () => {
      const result = await onDelete(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Showroom deleted.");
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div>
      <SectionHeader
        icon={<ShowroomIcon className="h-4.5 w-4.5" />}
        title="Showrooms"
        description="Registration applications and approval status"
        actionLabel="New Showroom"
        onAction={openCreate}
      />

      <TableShell>
        {items.length === 0 ? (
          <TableEmptyState message="No showroom registrations yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Business</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Location</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Submitted</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ShowroomLogo logoUrl={item.logoUrl} name={item.businessName} size={32} />
                      <span className="font-medium text-neutral-800">{item.businessName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">
                    <div>{item.email}</div>
                    <div className="text-xs text-neutral-400">{item.phone}</div>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{item.city ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{formatDate(item.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openReview(item)}
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Review
                      </button>
                      <RowIconButton label="Edit" onClick={() => openEdit(item)}>
                        <PencilIcon />
                      </RowIconButton>
                      <RowIconButton label="Delete" onClick={() => setDeleteTarget(item)} variant="danger">
                        <TrashIcon />
                      </RowIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      <Dialog
        open={reviewing !== null}
        onClose={closeReview}
        title={reviewing?.businessName ?? ""}
        size="lg"
      >
        {reviewing && previewingDocument && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewingDocument(null)}
                className="flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                <span aria-hidden="true">←</span> Back to details
              </button>
              <a
                href={previewingDocument.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-medium text-brand hover:underline"
              >
                Open in new tab ↗
              </a>
            </div>
            <p className="text-sm font-semibold text-neutral-800">{previewingDocument.name}</p>
            {previewingDocument.kind === "image" ? (
              <div className="relative h-[65vh] w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                <Image src={previewingDocument.url} alt={previewingDocument.name} fill unoptimized className="object-contain" />
              </div>
            ) : previewingDocument.kind === "pdf" ? (
              <iframe src={previewingDocument.url} title={previewingDocument.name} className="h-[65vh] w-full rounded-md border border-neutral-200" />
            ) : (
              <p className="rounded-md border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                Preview isn&apos;t available for this file type — use &quot;Open in new tab&quot; instead.
              </p>
            )}
          </div>
        )}

        {reviewing && !previewingDocument && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <ShowroomLogo logoUrl={reviewing.logoUrl} name={reviewing.businessName} size={40} />
                <div>
                  <p className="font-display font-semibold text-neutral-900">{reviewing.businessName}</p>
                  <p className="text-xs text-neutral-500">Submitted {formatDate(reviewing.createdAt)}</p>
                </div>
              </div>
              <StatusBadge status={reviewing.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoField icon={<MailIcon />} label="Email" value={reviewing.email} />
              <InfoField icon={<PhoneIcon />} label="Phone" value={reviewing.phone} />
              <InfoField
                icon={<PinIcon />}
                label="Location"
                value={[reviewing.address, reviewing.city].filter(Boolean).join(", ") || "—"}
                className="col-span-2"
              />
            </div>

            {reviewing.description && (
              <div>
                <p className="mb-1 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Description</p>
                <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">{reviewing.description}</p>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Documents</p>
              {reviewing.documents.length === 0 ? (
                <p className="text-sm text-neutral-400">No documents submitted.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {reviewing.documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2 text-neutral-700">
                        <FileIcon />
                        {formatDocumentType(doc.documentType)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        disabled={openingDocumentId === doc.id}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                      >
                        {openingDocumentId === doc.id ? "Opening…" : "View"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {reviewing.status === "PENDING" && (
              <div className="border-t border-neutral-200 pt-3">
                {confirming === null ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming("reject")}
                      className="rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming("approve")}
                      className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                    >
                      Approve
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-md bg-neutral-50 px-3 py-2.5">
                    <p className="text-sm text-neutral-700">
                      {confirming === "approve" ? "Approve this showroom? It will go live on the marketplace." : "Reject this application?"}
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => setConfirming(null)} className="text-xs font-medium text-neutral-500 hover:underline">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirming === "approve" ? handleApprove : handleReject}
                        disabled={reviewPending}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 ${
                          confirming === "approve" ? "bg-brand hover:bg-brand-dark" : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {reviewPending ? "Working…" : confirming === "approve" ? "Yes, approve" : "Yes, reject"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        open={dialogMode !== null}
        onClose={closeDialog}
        title={editingItem ? "Edit Showroom" : "New Showroom"}
        description={editingItem ? undefined : "Register a showroom on behalf of an existing user."}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          {!editingItem && (
            <div>
              <FieldLabel htmlFor="owner-mode-existing">Owner</FieldLabel>
              <div className="mb-2 inline-flex rounded-md border border-neutral-300 p-0.5 text-sm">
                <button
                  type="button"
                  id="owner-mode-existing"
                  aria-pressed={ownerMode === "existing"}
                  onClick={() => setOwnerMode("existing")}
                  className={`rounded px-3 py-1.5 font-medium ${ownerMode === "existing" ? "bg-brand text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
                >
                  Existing owner
                </button>
                <button
                  type="button"
                  aria-pressed={ownerMode === "new"}
                  onClick={() => setOwnerMode("new")}
                  className={`rounded px-3 py-1.5 font-medium ${ownerMode === "new" ? "bg-brand text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
                >
                  New owner
                </button>
              </div>

              {ownerMode === "existing" ? (
                <div className="relative">
                  {selectedOwner ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-800">{selectedOwner.fullName || selectedOwner.email}</p>
                        <p className="truncate text-xs text-neutral-500">{selectedOwner.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOwner(null);
                          setOwnerQuery("");
                        }}
                        className="shrink-0 text-xs font-medium text-neutral-500 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <Input
                        id="owner-search"
                        value={ownerQuery}
                        onChange={(e) => handleOwnerQueryChange(e.target.value)}
                        placeholder="Search by email…"
                        autoComplete="off"
                        autoFocus
                      />
                      {ownerQuery.trim().length >= 2 && (
                        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-md">
                          {ownerSearchLoading ? (
                            <p className="px-3 py-2 text-xs text-neutral-400">Searching…</p>
                          ) : ownerResults.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-neutral-400">No matching users found.</p>
                          ) : (
                            ownerResults.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setSelectedOwner(user);
                                  setOwnerResults([]);
                                }}
                                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-neutral-50"
                              >
                                <span className="font-medium text-neutral-800">{user.fullName || user.email}</span>
                                <span className="text-xs text-neutral-500">{user.email}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <div>
                    <FieldLabel htmlFor="new-owner-name">Owner full name</FieldLabel>
                    <Input
                      id="new-owner-name"
                      value={newOwner.ownerFullName}
                      onChange={(e) => setNewOwner((o) => ({ ...o, ownerFullName: e.target.value }))}
                      onBlur={(e) => validateOwnerField("ownerFullName", e.target.value)}
                      required
                      autoFocus
                      error={!!errorForOwnerField("ownerFullName")}
                    />
                    {errorForOwnerField("ownerFullName") && <p className="mt-1 text-sm text-red-600">{errorForOwnerField("ownerFullName")}</p>}
                  </div>
                  <div>
                    <FieldLabel htmlFor="new-owner-email">Owner email</FieldLabel>
                    <Input
                      id="new-owner-email"
                      type="email"
                      value={newOwner.ownerEmail}
                      onChange={(e) => setNewOwner((o) => ({ ...o, ownerEmail: e.target.value }))}
                      onBlur={(e) => validateOwnerField("ownerEmail", e.target.value)}
                      required
                      error={!!errorForOwnerField("ownerEmail")}
                    />
                    {errorForOwnerField("ownerEmail") && <p className="mt-1 text-sm text-red-600">{errorForOwnerField("ownerEmail")}</p>}
                  </div>
                  <div>
                    <FieldLabel htmlFor="new-owner-phone">Owner phone (optional)</FieldLabel>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-500">+254</span>
                      <Input
                        id="new-owner-phone"
                        value={newOwner.ownerPhone}
                        onChange={(e) => setNewOwner((o) => ({ ...o, ownerPhone: e.target.value }))}
                        onBlur={(e) => validateOwnerField("ownerPhone", e.target.value)}
                        placeholder="712345678"
                        error={!!errorForOwnerField("ownerPhone")}
                      />
                    </div>
                    {errorForOwnerField("ownerPhone") && <p className="mt-1 text-sm text-red-600">{errorForOwnerField("ownerPhone")}</p>}
                  </div>
                  <p className="text-xs text-neutral-500">We&apos;ll email them an invite to set up their login.</p>
                </div>
              )}
            </div>
          )}

          <div>
            <FieldLabel htmlFor="showroom-business-name">Business name</FieldLabel>
            <Input
              id="showroom-business-name"
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              onBlur={(e) => validateField("businessName", e.target.value)}
              required
              error={!!errorForField("businessName")}
            />
            {errorForField("businessName") && <p className="mt-1 text-sm text-red-600">{errorForField("businessName")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="showroom-logo">Logo (optional)</FieldLabel>
            <label
              htmlFor="showroom-logo"
              className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:border-brand hover:text-brand"
            >
              <UploadIcon />
              <span className="truncate">{logo ? logo.name : "Upload logo"}</span>
            </label>
            <input
              key={logoInputKey}
              id="showroom-logo"
              type="file"
              aria-label="Logo"
              accept={LOGO_ACCEPT}
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            {editingItem?.logoUrl && !logo && (
              <label className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
                <input type="checkbox" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} />
                Remove current logo
              </label>
            )}
          </div>

          {!editingItem && (
            <div>
              <FieldLabel htmlFor="showroom-documents">License / Registration documents (optional)</FieldLabel>
              <label
                htmlFor="showroom-documents"
                className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-neutral-300 px-4 py-5 text-center hover:border-brand"
              >
                <UploadIcon />
                <span className="mt-1.5 text-xs text-neutral-500">Upload PDF, JPG or PNG</span>
              </label>
              <input
                key={documentsInputKey}
                id="showroom-documents"
                type="file"
                multiple
                accept={DOCUMENT_ACCEPT}
                className="sr-only"
                onChange={(e) => setDocuments(Array.from(e.target.files ?? []))}
              />
              {documents.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ul className="flex flex-1 flex-wrap gap-2 text-xs text-neutral-600">
                    {documents.map((file) => (
                      <li key={file.name} className="rounded-md bg-neutral-100 px-2 py-1">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setDocuments([]);
                      setDocumentsInputKey((k) => k + 1);
                    }}
                    className="text-xs font-medium text-neutral-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <FieldLabel htmlFor="showroom-location">Location</FieldLabel>
            <Input
              id="showroom-location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              onBlur={(e) => validateField("location", e.target.value)}
              required
              error={!!errorForField("location")}
            />
            {errorForField("location") && <p className="mt-1 text-sm text-red-600">{errorForField("location")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="showroom-phone">Business phone</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">+254</span>
              <Input
                id="showroom-phone"
                value={form.businessPhone}
                onChange={(e) => setForm((f) => ({ ...f, businessPhone: e.target.value }))}
                onBlur={(e) => validateField("businessPhone", e.target.value)}
                placeholder="712345678"
                required
                error={!!errorForField("businessPhone")}
              />
            </div>
            {errorForField("businessPhone") && <p className="mt-1 text-sm text-red-600">{errorForField("businessPhone")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="showroom-email">Business email</FieldLabel>
            <Input
              id="showroom-email"
              type="email"
              value={form.businessEmail}
              onChange={(e) => setForm((f) => ({ ...f, businessEmail: e.target.value }))}
              onBlur={(e) => validateField("businessEmail", e.target.value)}
              required
              error={!!errorForField("businessEmail")}
            />
            {errorForField("businessEmail") && <p className="mt-1 text-sm text-red-600">{errorForField("businessEmail")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="showroom-address">Address (optional)</FieldLabel>
            <Input
              id="showroom-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              onBlur={(e) => validateField("address", e.target.value)}
              error={!!errorForField("address")}
            />
            {errorForField("address") && <p className="mt-1 text-sm text-red-600">{errorForField("address")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="showroom-description">Description (optional)</FieldLabel>
            <textarea
              id="showroom-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              onBlur={(e) => validateField("description", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand"
            />
            {errorForField("description") && <p className="mt-1 text-sm text-red-600">{errorForField("description")}</p>}
          </div>

          <DialogFormActions pending={crudPending} submitLabel={editingItem ? "Save changes" : "Create"} onCancel={closeDialog} />
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete showroom?"
        description={`Delete "${deleteTarget?.businessName}"? This permanently removes the showroom and its submitted documents.`}
        pending={crudPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ShowroomLogo({ logoUrl, name, size }: { logoUrl: string | null; name: string; size: number }) {
  if (!logoUrl) return <InitialAvatar name={name} />;
  return (
    <Image
      src={logoUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-lg border border-neutral-200 object-contain p-0.5"
      style={{ width: size, height: size }}
    />
  );
}

function InfoField({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-md border border-neutral-200 px-3 py-2 ${className ?? ""}`}>
      <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-neutral-700">{value}</dd>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M15.05 5a5 5 0 0 1 4 4M15.05 1a9 9 0 0 1 8 7.94" />
      <path d="M3 5c0 9.4 6.6 16 16 16 .9 0 1.6-.7 1.6-1.6v-2.8a1.6 1.6 0 0 0-1.3-1.57l-3.2-.65a1.6 1.6 0 0 0-1.68.73l-.7 1.15A12.6 12.6 0 0 1 8 12.28l1.15-.7a1.6 1.6 0 0 0 .73-1.68l-.65-3.2A1.6 1.6 0 0 0 7.66 5.3H4.86A1.6 1.6 0 0 0 3 6.9Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
