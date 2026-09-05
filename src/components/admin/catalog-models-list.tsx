"use client";

import { useState, useTransition } from "react";
import { useIsActiveCatalogTab } from "./catalog-tabs";
import {
  CarIcon,
  SectionHeader,
  DialogFormActions,
  FieldLabel,
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

export interface ModelItem {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
}

export interface BrandOption {
  id: string;
  name: string;
}

interface CatalogModelsListProps {
  items: ModelItem[];
  brands: BrandOption[];
  onCreate: (brandId: string, name: string) => Promise<{ error?: string }>;
  onUpdate: (id: string, name: string, brandId: string) => Promise<{ error?: string }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
}

export function CatalogModelsList({ items, brands, onCreate, onUpdate, onDelete }: CatalogModelsListProps) {
  const toast = useToast();
  const isActive = useIsActiveCatalogTab("models");
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<ModelItem | null>(null);
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModelItem | null>(null);
  const [pending, startTransition] = useTransition();

  // A Dialog/ConfirmDialog renders via a document.body portal, outside this
  // component's own (possibly `hidden`) tab panel — so leaving one open
  // while switching to a different tab would leave its full-viewport
  // overlay blocking that other tab. Close both the moment this panel
  // stops being the active one — done as a render-time state adjustment
  // (React's documented pattern for "reset state when a prop changes")
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
    setBrandId(brands[0]?.id ?? "");
    setFormError(null);
  }

  function openEdit(item: ModelItem) {
    setDialogMode("edit");
    setEditingItem(item);
    setName(item.name);
    setBrandId(item.brandId);
    setFormError(null);
  }

  function closeDialog() {
    setDialogMode(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = editingItem ? await onUpdate(editingItem.id, name, brandId) : await onCreate(brandId, name);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success(editingItem ? "Model updated." : "Model created.");
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
        toast.success("Model deleted.");
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div>
      <SectionHeader
        icon={<CarIcon />}
        title="Models"
        description="Vehicle models, each scoped to a Brand"
        actionLabel="New Model"
        onAction={openCreate}
      />

      <TableShell>
        {items.length === 0 ? (
          <TableEmptyState message="No models yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Brand</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium text-neutral-800">{item.name}</td>
                  <td className="px-5 py-3">
                    <MetaBadge>{item.brandName}</MetaBadge>
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
        title={editingItem ? "Edit Model" : "New Model"}
        description={editingItem ? undefined : "Add a new model to the catalog."}
      >
        {brands.length === 0 ? (
          <p className="text-sm text-neutral-500">Add a brand first before adding models.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {formError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <div className="mb-3">
              <FieldLabel htmlFor="model-brand">Brand</FieldLabel>
              <select
                id="model-brand"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <FieldLabel htmlFor="model-name">Name</FieldLabel>
            <Input id="model-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Corolla" autoFocus required />
            <div className="mt-4">
              <DialogFormActions pending={pending} submitLabel={editingItem ? "Save changes" : "Create"} onCancel={closeDialog} />
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete model?"
        description={`Delete "${deleteTarget?.name}"?`}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
