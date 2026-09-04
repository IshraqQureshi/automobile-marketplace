"use client";

import { useState, useTransition } from "react";
import { CarIcon, CatalogCardHeader, CheckIcon, MetaBadge, PencilIcon, PlusIcon, RowIconButton, TrashIcon, XIcon } from "./catalog-ui";

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
  const [newBrandId, setNewBrandId] = useState(brands[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrandId, setEditBrandId] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await onCreate(newBrandId, newName);
      if (result.error) {
        setError(result.error);
      } else {
        setNewName("");
      }
    });
  }

  function startEditing(item: ModelItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditBrandId(item.brandId);
    setError(null);
  }

  function handleSaveEdit(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await onUpdate(id, editName, editBrandId);
      if (result.error) {
        setError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleDelete(item: ModelItem) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete(item.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div data-testid="catalog-list-models" className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <CatalogCardHeader icon={<CarIcon />} title="Models" description="Scoped to a Brand" count={items.length} />

      <div className="border-b border-neutral-200 px-5 py-3">
        {error && <p className="mb-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-600">{error}</p>}
        {brands.length === 0 ? (
          <p className="text-xs text-neutral-400">Add a brand first before adding models.</p>
        ) : (
          <div className="flex min-w-0 gap-2">
            <select
              value={newBrandId}
              onChange={(e) => setNewBrandId(e.target.value)}
              className="w-24 min-w-0 shrink-0 rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Corolla"
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
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-neutral-400">No models yet.</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 items-center gap-3 border-b border-neutral-100 px-5 py-3 last:border-b-0 hover:bg-neutral-50">
              {editingId === item.id ? (
                <>
                  <select
                    value={editBrandId}
                    onChange={(e) => setEditBrandId(e.target.value)}
                    className="w-24 min-w-0 shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    autoFocus
                  />
                  <RowIconButton label="Save" onClick={() => handleSaveEdit(item.id)} disabled={pending} variant="brand">
                    <CheckIcon />
                  </RowIconButton>
                  <RowIconButton label="Cancel" onClick={() => setEditingId(null)}>
                    <XIcon />
                  </RowIconButton>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">{item.name}</span>
                  <MetaBadge>{item.brandName}</MetaBadge>
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
