"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { CatalogCardHeader, CheckIcon, MetaBadge, PencilIcon, PlusIcon, RowIconButton, TagIcon, TrashIcon, UploadIcon, XIcon } from "./catalog-ui";

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
 * Brands get their own CRUD list (rather than reusing CatalogList, which
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
  const [newName, setNewName] = useState("");
  const [newLogo, setNewLogo] = useState<File | null>(null);
  const [newLogoInputKey, setNewLogoInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLogo, setEditLogo] = useState<File | null>(null);
  const [editRemoveLogo, setEditRemoveLogo] = useState(false);
  const [editLogoInputKey, setEditLogoInputKey] = useState(0);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", newName);
      if (newLogo) formData.set("logo", newLogo);
      const result = await onCreate(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setNewName("");
        setNewLogo(null);
        setNewLogoInputKey((k) => k + 1);
      }
    });
  }

  function startEditing(item: BrandItem) {
    setEditingId(item.id);
    setEditValue(item.name);
    setEditLogo(null);
    setEditRemoveLogo(false);
    setEditLogoInputKey((k) => k + 1);
    setError(null);
  }

  function handleSaveEdit(id: string) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("name", editValue);
      if (editLogo) formData.set("logo", editLogo);
      if (editRemoveLogo) formData.set("removeLogo", "true");
      const result = await onUpdate(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleDelete(item: BrandItem) {
    const message = `Delete "${item.name}"?${deleteWarning ? ` ${deleteWarning}` : ""}`;
    if (!window.confirm(message)) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete(item.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div data-testid={`catalog-list-${title.toLowerCase()}`} className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <CatalogCardHeader icon={<TagIcon />} title={title} description={description} count={items.length} />

      <div className="border-b border-neutral-200 px-5 py-3">
        {error && <p className="mb-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-600">{error}</p>}
        <div className="flex min-w-0 gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={addPlaceholder}
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending || !newName.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon />
            Add
          </button>
        </div>
        <div className="mt-2">
          <label
            htmlFor="new-brand-logo"
            className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-500 hover:border-brand hover:text-brand"
          >
            <UploadIcon />
            <span className="truncate">{newLogo ? newLogo.name : "Upload logo (optional)"}</span>
          </label>
          <input
            key={newLogoInputKey}
            id="new-brand-logo"
            type="file"
            aria-label="Logo"
            accept={LOGO_ACCEPT}
            onChange={(e) => setNewLogo(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-neutral-400">{emptyMessage}</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 items-center gap-3 border-b border-neutral-100 px-5 py-3 last:border-b-0 hover:bg-neutral-50">
              {editingId === item.id ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                      autoFocus
                    />
                    <RowIconButton label="Save" onClick={() => handleSaveEdit(item.id)} disabled={pending} variant="brand">
                      <CheckIcon />
                    </RowIconButton>
                    <RowIconButton label="Cancel" onClick={() => setEditingId(null)}>
                      <XIcon />
                    </RowIconButton>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={`edit-brand-logo-${item.id}`}
                      className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-500 hover:border-brand hover:text-brand"
                    >
                      <UploadIcon />
                      <span className="truncate">{editLogo ? editLogo.name : "Replace logo"}</span>
                    </label>
                    <input
                      key={editLogoInputKey}
                      id={`edit-brand-logo-${item.id}`}
                      type="file"
                      aria-label="Replace logo"
                      accept={LOGO_ACCEPT}
                      onChange={(e) => setEditLogo(e.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                    {item.logoUrl && !editLogo && (
                      <label className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500">
                        <input type="checkbox" checked={editRemoveLogo} onChange={(e) => setEditRemoveLogo(e.target.checked)} />
                        Remove logo
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <BrandLogoThumbnail logoUrl={item.logoUrl} name={item.name} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">{item.name}</span>
                  {item.meta && <MetaBadge>{item.meta}</MetaBadge>}
                  <RowIconButton label="Edit" onClick={() => startEditing(item)}>
                    <PencilIcon />
                  </RowIconButton>
                  <RowIconButton label="Delete" onClick={() => handleDelete(item)} disabled={pending} variant="danger">
                    <TrashIcon />
                  </RowIconButton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
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
