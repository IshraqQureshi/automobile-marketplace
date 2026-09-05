"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useIsActiveCatalogTab } from "./catalog-tabs";
import {
  SectionHeader,
  DialogFormActions,
  FieldLabel,
  FilterBar,
  MetaBadge,
  PencilIcon,
  RowIconButton,
  SearchInput,
  TableEmptyState,
  TableShell,
  TagIcon,
  TrashIcon,
  UploadIcon,
} from "./admin-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { catalogFieldSchemas, catalogNameSchema } from "@/features/admin/catalog-schemas";
import { validateLogoFile } from "@/features/admin/logo-upload";

export interface BrandItem {
  id: string;
  name: string;
  meta?: string;
  logoUrl: string | null;
}

interface CatalogBrandsListProps {
  title: string;
  description: string;
  items: BrandItem[];
  addPlaceholder: string;
  emptyMessage: string;
  onCreate: (formData: FormData) => Promise<{ error?: string }>;
  onUpdate: (formData: FormData) => Promise<{ error?: string }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
  // Plain string, not a function — see catalog-list.tsx's comment on the
  // same prop; a closure can't be passed from the Server Component that
  // renders this list down to this Client Component.
  deleteWarning?: string;
}

const LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/svg+xml";

/**
 * Brands get their own CRUD table (rather than reusing CatalogList, which
 * Vehicle Types still uses) because a logo upload needs FormData-based
 * actions and a thumbnail/file-input UI that Types doesn't need — same
 * reasoning as why Models has its own component.
 */
export function CatalogBrandsList({
  title,
  description,
  items,
  addPlaceholder,
  emptyMessage,
  onCreate,
  onUpdate,
  onDelete,
  deleteWarning,
}: CatalogBrandsListProps) {
  const toast = useToast();
  const isActive = useIsActiveCatalogTab("brands");
  const { validate, errorFor, reset: resetValidation } = useFieldValidation(catalogFieldSchemas);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<BrandItem | null>(null);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const nameError = errorFor("name");
  const [deleteTarget, setDeleteTarget] = useState<BrandItem | null>(null);
  const [pending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, searchQuery]);

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
    setLogo(null);
    setRemoveLogo(false);
    setLogoInputKey((k) => k + 1);
    setFormError(null);
    resetValidation();
  }

  function openEdit(item: BrandItem) {
    setDialogMode("edit");
    setEditingItem(item);
    setName(item.name);
    setLogo(null);
    setRemoveLogo(false);
    setLogoInputKey((k) => k + 1);
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
    if (logo) {
      const logoError = validateLogoFile(logo);
      if (logoError) {
        setFormError(logoError);
        return;
      }
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      if (logo) formData.set("logo", logo);
      if (editingItem) {
        formData.set("id", editingItem.id);
        if (removeLogo) formData.set("removeLogo", "true");
      }
      const result = editingItem ? await onUpdate(formData) : await onCreate(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success(editingItem ? "Brand updated." : "Brand created.");
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
        toast.success("Brand deleted.");
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div>
      <SectionHeader icon={<TagIcon />} title={title} description={description} actionLabel="New Brand" onAction={openCreate} />

      {items.length > 0 && (
        <FilterBar>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search brands…" />
        </FilterBar>
      )}

      <TableShell>
        {items.length === 0 ? (
          <TableEmptyState message={emptyMessage} />
        ) : filteredItems.length === 0 ? (
          <TableEmptyState message="No brands match your search." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <BrandLogoThumbnail logoUrl={item.logoUrl} name={item.name} />
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
        title={editingItem ? "Edit Brand" : "New Brand"}
        description={editingItem ? undefined : "Add a new vehicle manufacturer to the catalog."}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          <FieldLabel htmlFor="brand-name">Name</FieldLabel>
          <Input
            id="brand-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => validate("name", e.target.value)}
            placeholder={addPlaceholder}
            autoFocus
            required
            error={!!nameError}
          />
          {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}

          <div className="mt-3">
            <FieldLabel htmlFor="brand-logo">Logo</FieldLabel>
            <label
              htmlFor="brand-logo"
              className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:border-brand hover:text-brand"
            >
              <UploadIcon />
              <span className="truncate">{logo ? logo.name : "Upload logo (optional)"}</span>
            </label>
            <input
              key={logoInputKey}
              id="brand-logo"
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

          <div className="mt-4">
            <DialogFormActions pending={pending} submitLabel={editingItem ? "Save changes" : "Create"} onCancel={closeDialog} />
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete brand?"
        description={`Delete "${deleteTarget?.name}"?${deleteWarning ? ` ${deleteWarning}` : ""}`}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function BrandLogoThumbnail({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  if (!logoUrl) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-400">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={logoUrl}
      alt={`${name} logo`}
      width={32}
      height={32}
      unoptimized
      className="h-8 w-8 shrink-0 rounded-lg border border-neutral-200 object-contain p-0.5"
    />
  );
}
