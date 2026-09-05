"use client";

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
import { approveShowroomAction, getShowroomDocumentUrlAction, rejectShowroomAction, type ShowroomOwnerCandidate } from "@/features/admin/showroom-actions";
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

const OWNER_SEARCH_DEBOUNCE_MS = 300;
const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

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

export function ShowroomList({ items, onCreate, onUpdate, onDelete, onSearchOwners }: ShowroomListProps) {
  const toast = useToast();

  // Approve/reject inside the Review dialog and the create/edit/delete CRUD
  // dialogs are independent transitions — the two dialogs never open at the
  // same time, but keeping them separate avoids one flow's pending state
  // spuriously disabling the other's buttons.
  const [reviewing, setReviewing] = useState<ShowroomListItem | null>(null);
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [reviewPending, startReviewTransition] = useTransition();

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
  }

  function closeReview() {
    setReviewing(null);
    setConfirming(null);
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
    window.open(result.url, "_blank", "noopener,noreferrer");
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
    if (!editingItem) {
      if (ownerMode === "existing" && !selectedOwner) {
        setFormError("Choose an owner for this showroom.");
        return;
      }
      if (ownerMode === "new" && !newOwner.ownerFullName.trim()) {
        setFormError("Enter the new owner's full name.");
        return;
      }
      if (ownerMode === "new" && !newOwner.ownerEmail.trim()) {
        setFormError("Enter the new owner's email.");
        return;
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
      if (editingItem) {
        formData.set("id", editingItem.id);
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
                      <InitialAvatar name={item.businessName} />
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
        description={reviewing ? `Submitted ${formatDate(reviewing.createdAt)}` : undefined}
      >
        {reviewing && (
          <div className="flex flex-col gap-4">
            <StatusBadge status={reviewing.status} />

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Email</dt>
                <dd className="text-neutral-700">{reviewing.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Phone</dt>
                <dd className="text-neutral-700">{reviewing.phone}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Location</dt>
                <dd className="text-neutral-700">{[reviewing.address, reviewing.city].filter(Boolean).join(", ") || "—"}</dd>
              </div>
              {reviewing.description && (
                <div className="col-span-2">
                  <dt className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Description</dt>
                  <dd className="text-neutral-700">{reviewing.description}</dd>
                </div>
              )}
            </dl>

            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Documents</p>
              {reviewing.documents.length === 0 ? (
                <p className="text-sm text-neutral-400">No documents submitted.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {reviewing.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm">
                      <span className="text-neutral-700">{formatDocumentType(doc.documentType)}</span>
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        disabled={openingDocumentId === doc.id}
                        className="text-xs font-medium text-brand hover:underline disabled:opacity-60"
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          {!editingItem && (
            <div>
              <FieldLabel htmlFor="owner-mode-existing">Owner</FieldLabel>
              <div className="mb-2 inline-flex rounded-md border border-neutral-300 p-0.5 text-sm">
                <button
                  type="button"
                  id="owner-mode-existing"
                  onClick={() => setOwnerMode("existing")}
                  className={`rounded px-3 py-1.5 font-medium ${ownerMode === "existing" ? "bg-brand text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
                >
                  Existing owner
                </button>
                <button
                  type="button"
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
                      autoFocus
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="new-owner-email">Owner email</FieldLabel>
                    <Input
                      id="new-owner-email"
                      type="email"
                      value={newOwner.ownerEmail}
                      onChange={(e) => setNewOwner((o) => ({ ...o, ownerEmail: e.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="new-owner-phone">Owner phone (optional)</FieldLabel>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-500">+254</span>
                      <Input
                        id="new-owner-phone"
                        value={newOwner.ownerPhone}
                        onChange={(e) => setNewOwner((o) => ({ ...o, ownerPhone: e.target.value }))}
                        placeholder="712345678"
                      />
                    </div>
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
              required
            />
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
            <Input id="showroom-location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} required />
          </div>

          <div>
            <FieldLabel htmlFor="showroom-phone">Business phone</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">+254</span>
              <Input
                id="showroom-phone"
                value={form.businessPhone}
                onChange={(e) => setForm((f) => ({ ...f, businessPhone: e.target.value }))}
                placeholder="712345678"
                required
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="showroom-email">Business email</FieldLabel>
            <Input
              id="showroom-email"
              type="email"
              value={form.businessEmail}
              onChange={(e) => setForm((f) => ({ ...f, businessEmail: e.target.value }))}
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="showroom-address">Address (optional)</FieldLabel>
            <Input id="showroom-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>

          <div>
            <FieldLabel htmlFor="showroom-description">Description (optional)</FieldLabel>
            <textarea
              id="showroom-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand"
            />
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
