"use client";

import { useRef, useState, useTransition } from "react";
import { DialogFormActions, FieldLabel, InitialAvatar, PencilIcon, RowIconButton, SectionHeader, ShowroomIcon, StatusBadge, TableEmptyState, TableShell, TrashIcon } from "./admin-ui";
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
  onCreate: (formData: FormData) => Promise<{ error?: string }>;
  onUpdate: (formData: FormData) => Promise<{ error?: string }>;
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

interface ShowroomFormState {
  businessName: string;
  location: string;
  businessPhone: string;
  businessEmail: string;
  address: string;
  description: string;
}

const BLANK_FORM: ShowroomFormState = { businessName: "", location: "", businessPhone: "", businessEmail: "", address: "", description: "" };

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
  const [selectedOwner, setSelectedOwner] = useState<ShowroomOwnerCandidate | null>(null);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerResults, setOwnerResults] = useState<ShowroomOwnerCandidate[]>([]);
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShowroomListItem | null>(null);
  const [crudPending, startCrudTransition] = useTransition();
  const ownerSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setSelectedOwner(null);
    setOwnerQuery("");
    setOwnerResults([]);
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
    setSelectedOwner(null);
    setOwnerQuery("");
    setOwnerResults([]);
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
      setOwnerResults([]);
      setOwnerSearchLoading(false);
      return;
    }
    setOwnerSearchLoading(true);
    ownerSearchDebounce.current = setTimeout(async () => {
      const result = await onSearchOwners(value);
      setOwnerResults(result.users);
      setOwnerSearchLoading(false);
    }, OWNER_SEARCH_DEBOUNCE_MS);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!editingItem && !selectedOwner) {
      setFormError("Choose an owner for this showroom.");
      return;
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
      } else if (selectedOwner) {
        formData.set("ownerUserId", selectedOwner.id);
      }
      const result = editingItem ? await onUpdate(formData) : await onCreate(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success(editingItem ? "Showroom updated." : "Showroom created.");
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
            <div className="relative">
              <FieldLabel htmlFor="owner-search">Owner</FieldLabel>
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
