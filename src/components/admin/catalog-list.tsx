"use client";

import { useState, useTransition } from "react";
import {
  CatalogSectionHeader,
  DialogFormActions,
  FieldLabel,
  InitialAvatar,
  MetaBadge,
  PencilIcon,
  RowIconButton,
  TableEmptyState,
  TableShell,
  TrashIcon,
} from "./catalog-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export interface CatalogItem {
  id: string;
  name: string;
  meta?: string;
}

interface CatalogListProps {
  icon: React.ReactNode;
  title: string;
  singular: string;
  description: string;
  items: CatalogItem[];
  addPlaceholder: string;
  emptyMessage: string;
  onCreate: (name: string) => Promise<{ error?: string }>;
  onUpdate: (id: string, name: string) => Promise<{ error?: string }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
  // Plain string, not a function — a closure can't be passed from the
  // Server Component that renders this list down to this Client Component
  // ("Functions cannot be passed directly to Client Components" unless
  // it's a Server Action specifically).
  deleteWarning?: string;
}

/**
 * Shared CRUD table for the simple (name-only) catalog entities — currently
 * just Vehicle Types. Brands and Models have their own components since
 * they need a logo upload / a Brand selector respectively.
 */
export function CatalogList({
  icon,
  title,
  singular,
  description,
  items,
  addPlaceholder,
  emptyMessage,
  onCreate,
  onUpdate,
  onDelete,
  deleteWarning,
}: CatalogListProps) {
  const toast = useToast();
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setDialogMode("create");
    setEditingItem(null);
    setName("");
    setFormError(null);
  }

  function openEdit(item: CatalogItem) {
    setDialogMode("edit");
    setEditingItem(item);
    setName(item.name);
    setFormError(null);
  }

  function closeDialog() {
    setDialogMode(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = editingItem ? await onUpdate(editingItem.id, name) : await onCreate(name);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success(editingItem ? `${singular} updated.` : `${singular} created.`);
      closeDialog();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await onDelete(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${singular} deleted.`);
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div>
      <CatalogSectionHeader icon={icon} title={title} description={description} actionLabel={`New ${singular}`} onAction={openCreate} />

      <TableShell>
        {items.length === 0 ? (
          <TableEmptyState message={emptyMessage} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <InitialAvatar name={item.name} />
                      <span className="font-medium text-neutral-800">{item.name}</span>
                      {item.meta && <MetaBadge>{item.meta}</MetaBadge>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
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
        open={dialogMode !== null}
        onClose={closeDialog}
        title={editingItem ? `Edit ${singular}` : `New ${singular}`}
        description={editingItem ? undefined : `Add a new ${singular.toLowerCase()} to the catalog.`}
      >
        <form onSubmit={handleSubmit}>
          {formError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <FieldLabel htmlFor="catalog-item-name">Name</FieldLabel>
          <Input id="catalog-item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={addPlaceholder} autoFocus required />
          <div className="mt-4">
            <DialogFormActions pending={pending} submitLabel={editingItem ? "Save changes" : "Create"} onCancel={closeDialog} />
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${singular.toLowerCase()}?`}
        description={`Delete "${deleteTarget?.name}"?${deleteWarning ? ` ${deleteWarning}` : ""}`}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
