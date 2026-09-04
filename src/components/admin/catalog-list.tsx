"use client";

import { useState, useTransition } from "react";
import { CatalogCardHeader, CheckIcon, InitialAvatar, MetaBadge, PencilIcon, PlusIcon, RowIconButton, TrashIcon, XIcon } from "./catalog-ui";

export interface CatalogItem {
  id: string;
  name: string;
  meta?: string;
}

interface CatalogListProps {
  icon: React.ReactNode;
  title: string;
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
 * Shared CRUD list for the simple (name-only) catalog entities — currently
 * just Vehicle Types. Brands and Models have their own components since
 * they need a logo upload / a Brand selector respectively.
 */
export function CatalogList({
  icon,
  title,
  description,
  items,
  addPlaceholder,
  emptyMessage,
  onCreate,
  onUpdate,
  onDelete,
  deleteWarning,
}: CatalogListProps) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await onCreate(newName);
      if (result.error) {
        setError(result.error);
      } else {
        setNewName("");
      }
    });
  }

  function startEditing(item: CatalogItem) {
    setEditingId(item.id);
    setEditValue(item.name);
    setError(null);
  }

  function handleSaveEdit(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await onUpdate(id, editValue);
      if (result.error) {
        setError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleDelete(item: CatalogItem) {
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
      <CatalogCardHeader icon={icon} title={title} description={description} count={items.length} />

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
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-neutral-400">{emptyMessage}</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 items-center gap-3 border-b border-neutral-100 px-5 py-3 last:border-b-0 hover:bg-neutral-50">
              {editingId === item.id ? (
                <>
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
                </>
              ) : (
                <>
                  <InitialAvatar name={item.name} />
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
