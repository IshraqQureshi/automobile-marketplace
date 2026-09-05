"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  DialogFormActions,
  FieldLabel,
  MetaBadge,
  PencilIcon,
  RowIconButton,
  SectionHeader,
  TableEmptyState,
  TableShell,
  TrashIcon,
  UploadIcon,
} from "./admin-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { highlightFieldSchemas, socialLinkFieldSchemas } from "@/features/admin/homepage-highlights-schemas";
import { validateThumbnailFile } from "@/features/admin/homepage-highlight-upload";

export type HighlightPlatform = "TIKTOK" | "YOUTUBE";

export interface HighlightItem {
  id: string;
  platform: HighlightPlatform;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
  isActive: boolean;
}

const THUMBNAIL_ACCEPT = "image/jpeg,image/png,image/webp";
const PLATFORM_LABELS: Record<HighlightPlatform, string> = { TIKTOK: "TikTok", YOUTUBE: "YouTube" };
const PLATFORM_BADGE_CLASSES: Record<HighlightPlatform, string> = {
  TIKTOK: "bg-neutral-900 text-white",
  YOUTUBE: "bg-red-600 text-white",
};

interface HighlightFormState {
  title: string;
  platform: HighlightPlatform;
  videoUrl: string;
  sortOrder: string;
  isActive: boolean;
}

const BLANK_FORM: HighlightFormState = { title: "", platform: "TIKTOK", videoUrl: "", sortOrder: "0", isActive: true };

interface HomepageHighlightsListProps {
  items: HighlightItem[];
  socialLinks: { tiktokProfileUrl: string; youtubeChannelUrl: string };
  onCreate: (formData: FormData) => Promise<{ error?: string }>;
  onUpdate: (formData: FormData) => Promise<{ error?: string }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
  onUpdateSocialLinks: (formData: FormData) => Promise<{ error?: string }>;
}

export function HomepageHighlightsList({ items, socialLinks, onCreate, onUpdate, onDelete, onUpdateSocialLinks }: HomepageHighlightsListProps) {
  const toast = useToast();
  const { validate, errorFor } = useFieldValidation(highlightFieldSchemas);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<HighlightItem | null>(null);
  const [form, setForm] = useState<HighlightFormState>(BLANK_FORM);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailInputKey, setThumbnailInputKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HighlightItem | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setDialogMode("create");
    setEditingItem(null);
    setForm(BLANK_FORM);
    setThumbnail(null);
    setThumbnailInputKey((k) => k + 1);
    setFormError(null);
  }

  function openEdit(item: HighlightItem) {
    setDialogMode("edit");
    setEditingItem(item);
    setForm({ title: item.title, platform: item.platform, videoUrl: item.videoUrl, sortOrder: String(item.sortOrder), isActive: item.isActive });
    setThumbnail(null);
    setThumbnailInputKey((k) => k + 1);
    setFormError(null);
  }

  function closeDialog() {
    setDialogMode(null);
  }

  function setField<K extends keyof HighlightFormState>(key: K, value: HighlightFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    for (const field of ["title", "videoUrl", "platform"] as const) {
      if (!highlightFieldSchemas[field].safeParse(form[field]).success) {
        validate(field, form[field]);
        hasError = true;
      }
    }
    if (hasError) return;
    if (!editingItem && !thumbnail) {
      setFormError("A thumbnail image is required.");
      return;
    }
    if (thumbnail) {
      const thumbnailError = validateThumbnailFile(thumbnail);
      if (thumbnailError) {
        setFormError(thumbnailError);
        return;
      }
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", form.title);
      formData.set("platform", form.platform);
      formData.set("videoUrl", form.videoUrl);
      formData.set("sortOrder", form.sortOrder);
      formData.set("isActive", String(form.isActive));
      if (thumbnail) formData.set("thumbnail", thumbnail);
      if (editingItem) formData.set("id", editingItem.id);

      const result = editingItem ? await onUpdate(formData) : await onCreate(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success(editingItem ? "Highlight updated." : "Highlight created.");
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
        toast.success("Highlight deleted.");
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <SocialLinksCard socialLinks={socialLinks} onUpdateSocialLinks={onUpdateSocialLinks} />

      <div>
        <SectionHeader
          icon={<VideoIcon />}
          title="Homepage Highlights"
          description="TikTok/YouTube video cards shown on the homepage's Watch & Discover and Reviews & Guides sections"
          actionLabel="New Highlight"
          onAction={openCreate}
        />

        <TableShell>
          {items.length === 0 ? (
            <TableEmptyState message="No highlights yet. Add one to populate the homepage's video sections." />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  <th className="px-5 py-3 font-semibold">Highlight</th>
                  <th className="px-5 py-3 font-semibold">Platform</th>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100">
                          <Image src={item.thumbnailUrl} alt="" width={56} height={40} unoptimized className="h-full w-full object-cover" />
                        </div>
                        <span className="truncate font-medium text-neutral-800">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PLATFORM_BADGE_CLASSES[item.platform]}`}>
                        {PLATFORM_LABELS[item.platform]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-600 tabular-nums">{item.sortOrder}</td>
                    <td className="px-5 py-3">
                      <MetaBadge>{item.isActive ? "Active" : "Hidden"}</MetaBadge>
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
      </div>

      <Dialog
        open={dialogMode !== null}
        onClose={closeDialog}
        title={editingItem ? "Edit Highlight" : "New Highlight"}
        description={editingItem ? undefined : "Add a TikTok or YouTube video card to the homepage."}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formError && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          <div className="mb-3">
            <FieldLabel htmlFor="highlight-platform">Platform</FieldLabel>
            <select
              id="highlight-platform"
              value={form.platform}
              onChange={(e) => setField("platform", e.target.value as HighlightPlatform)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="TIKTOK">TikTok</option>
              <option value="YOUTUBE">YouTube</option>
            </select>
          </div>

          <FieldLabel htmlFor="highlight-title">Title</FieldLabel>
          <Input
            id="highlight-title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            onBlur={(e) => validate("title", e.target.value)}
            placeholder="e.g. 2024 BMW M3 — Track Day"
            autoFocus
            required
            error={!!errorFor("title")}
          />
          {errorFor("title") && <p className="mt-1 text-sm text-red-600">{errorFor("title")}</p>}

          <div className="mt-3">
            <FieldLabel htmlFor="highlight-video-url">Video URL</FieldLabel>
            <Input
              id="highlight-video-url"
              value={form.videoUrl}
              onChange={(e) => setField("videoUrl", e.target.value)}
              onBlur={(e) => validate("videoUrl", e.target.value)}
              placeholder="https://www.tiktok.com/@harakagari/video/..."
              required
              error={!!errorFor("videoUrl")}
            />
            {errorFor("videoUrl") && <p className="mt-1 text-sm text-red-600">{errorFor("videoUrl")}</p>}
          </div>

          <div className="mt-3">
            <FieldLabel htmlFor="highlight-thumbnail">Thumbnail</FieldLabel>
            <label
              htmlFor="highlight-thumbnail"
              className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:border-brand hover:text-brand"
            >
              <UploadIcon />
              <span className="truncate">{thumbnail ? thumbnail.name : editingItem ? "Replace thumbnail (optional)" : "Upload thumbnail"}</span>
            </label>
            <input
              key={thumbnailInputKey}
              id="highlight-thumbnail"
              type="file"
              aria-label="Thumbnail"
              accept={THUMBNAIL_ACCEPT}
              onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="highlight-sort-order">Sort order</FieldLabel>
              <Input
                id="highlight-sort-order"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setField("sortOrder", e.target.value)}
              />
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-1.5 text-sm text-neutral-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
                Visible on homepage
              </label>
            </div>
          </div>

          <div className="mt-4">
            <DialogFormActions pending={pending} submitLabel={editingItem ? "Save changes" : "Create"} onCancel={closeDialog} />
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete highlight?"
        description={`Delete "${deleteTarget?.title}"? This removes it from the homepage immediately.`}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SocialLinksCard({
  socialLinks,
  onUpdateSocialLinks,
}: {
  socialLinks: { tiktokProfileUrl: string; youtubeChannelUrl: string };
  onUpdateSocialLinks: (formData: FormData) => Promise<{ error?: string }>;
}) {
  const toast = useToast();
  const { validate, errorFor } = useFieldValidation(socialLinkFieldSchemas);
  const [tiktokProfileUrl, setTiktokProfileUrl] = useState(socialLinks.tiktokProfileUrl);
  const [youtubeChannelUrl, setYoutubeChannelUrl] = useState(socialLinks.youtubeChannelUrl);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    for (const [field, value] of [
      ["tiktokProfileUrl", tiktokProfileUrl],
      ["youtubeChannelUrl", youtubeChannelUrl],
    ] as const) {
      if (value && !socialLinkFieldSchemas[field].safeParse(value).success) {
        validate(field, value);
        hasError = true;
      }
    }
    if (hasError) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("tiktokProfileUrl", tiktokProfileUrl);
      formData.set("youtubeChannelUrl", youtubeChannelUrl);
      const result = await onUpdateSocialLinks(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Social links updated.");
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-neutral-900">Social links</h2>
      <p className="mt-0.5 text-sm text-neutral-500">
        Linked from the &ldquo;@HarakaGari&rdquo; buttons on the homepage&rsquo;s Watch &amp; Discover / Reviews &amp; Guides sections.
      </p>

      {formError && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="tiktok-profile-url">TikTok profile URL</FieldLabel>
          <Input
            id="tiktok-profile-url"
            value={tiktokProfileUrl}
            onChange={(e) => setTiktokProfileUrl(e.target.value)}
            onBlur={(e) => validate("tiktokProfileUrl", e.target.value)}
            placeholder="https://www.tiktok.com/@harakagari"
            error={!!errorFor("tiktokProfileUrl")}
          />
          {errorFor("tiktokProfileUrl") && <p className="mt-1 text-sm text-red-600">{errorFor("tiktokProfileUrl")}</p>}
        </div>
        <div>
          <FieldLabel htmlFor="youtube-channel-url">YouTube channel URL</FieldLabel>
          <Input
            id="youtube-channel-url"
            value={youtubeChannelUrl}
            onChange={(e) => setYoutubeChannelUrl(e.target.value)}
            onBlur={(e) => validate("youtubeChannelUrl", e.target.value)}
            placeholder="https://www.youtube.com/@harakagari"
            error={!!errorFor("youtubeChannelUrl")}
          />
          {errorFor("youtubeChannelUrl") && <p className="mt-1 text-sm text-red-600">{errorFor("youtubeChannelUrl")}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save links"}
      </button>
    </form>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden="true">
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="m17 10 4-3v10l-4-3" />
    </svg>
  );
}
