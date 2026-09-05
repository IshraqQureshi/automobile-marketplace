"use client";

import { useState, useTransition } from "react";
import { useIsActiveCatalogTab } from "./catalog-tabs";
import {
  SectionHeader,
  DialogFormActions,
  FieldLabel,
  InitialAvatar,
  MetaBadge,
  PencilIcon,
  RowIconButton,
  TableEmptyState,
  TableShell,
  TrashIcon,
} from "./admin-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { catalogFieldSchemas, catalogNameSchema } from "@/features/admin/catalog-schemas";

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
  // Which CatalogTabs panel this instance lives in — CatalogList is reused
  // across different tabs (currently just "types"), unlike
  // CatalogBrandsList/CatalogModelsList which always represent one fixed
  // tab, so this can't be hardcoded the way theirs is.
  tabKey: "brands" | "models" | "types";
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
  tabKey,
}: CatalogListProps) {
  const toast = useToast();
  const isActive = useIsActiveCatalogTab(tabKey);
  const { validate, errorFor, reset: resetValidation } = useFieldValidation(catalogFieldSchemas);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const nameError = errorFor("name");
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [pending, startTransition] = useTransition();

  // A Dialog/ConfirmDialog renders via a document.body portal, outside this
  // component's own (possibly `hidden`) tab panel — so leaving one open
  // while switching to a different tab would leave its full-viewport
  // overlay blocking that other tab. Close both the moment this panel
  // stops being the active one — done as a render-time state adjustment
  // (React's documented pattern for "reset state when a prop changes",
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  // rather than a useEffect, which this project's lint config flags as a
  // setState-in-effect anti-pattern.
  const [prevIsActive, setPrevIsActive] = useState(isActive);
  if (isActive !== prevIsActive) {
    setPrevIsActive(isActive);
    if (!isActive) {
      setDialogMode(null);
      setDeleteTarget(null);
    }
  }

  function openCreate() {
    setDialogMode("create");
    setEditingItem(null);
    setName("");
    setFormError(null);
    resetValidation();
  }

  function openEdit(item: CatalogItem) {
    setDialogMode("edit");
    setEditingItem(item);
    setName(item.name);
    setFormError(null);
    resetValidation();
  }

  function closeDialog() {
    setDialogMode(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = catalogNameSchema.safeParse(name);
    if (!parsed.success) {
      // Only the inline per-field error below the input — not also the
      // top banner, which would show the exact same message twice.
      validate("name", name);
      return;
    }
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
      <SectionHeader icon={icon} title={title} description={description} actionLabel={`New ${singular}`} onAction={openCreate} />

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
        <form onSubmit={handleSubmit} noValidate>
          {formError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <FieldLabel htmlFor="catalog-item-name">Name</FieldLabel>
          <Input
            id="catalog-item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => validate("name", e.target.value)}
            placeholder={addPlaceholder}
            autoFocus
            required
            error={!!nameError}
          />
          {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
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
