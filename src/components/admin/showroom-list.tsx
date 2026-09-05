"use client";

import { useState, useTransition } from "react";
import { InitialAvatar, SectionHeader, ShowroomIcon, StatusBadge, TableEmptyState, TableShell } from "./admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { approveShowroomAction, getShowroomDocumentUrlAction, rejectShowroomAction } from "@/features/admin/showroom-actions";

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

export function ShowroomList({ items }: ShowroomListProps) {
  const toast = useToast();
  const [reviewing, setReviewing] = useState<ShowroomListItem | null>(null);
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    startTransition(async () => {
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
    startTransition(async () => {
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

  return (
    <div>
      <SectionHeader
        icon={<ShowroomIcon className="h-4.5 w-4.5" />}
        title="Showrooms"
        description="Registration applications and approval status"
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
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => openReview(item)}
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Review
                      </button>
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
                        disabled={pending}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 ${
                          confirming === "approve" ? "bg-brand hover:bg-brand-dark" : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {pending ? "Working…" : confirming === "approve" ? "Yes, approve" : "Yes, reject"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
