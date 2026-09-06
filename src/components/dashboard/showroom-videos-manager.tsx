"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FieldLabel, TrashIcon } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createShowroomVideoAction, deleteShowroomVideoAction } from "@/features/showroom/video-actions";
import { showroomVideoFieldSchemas } from "@/features/showroom/video-schemas";
import { getYouTubeThumbnailUrl } from "@/lib/video-embed";

export interface ShowroomVideoItem {
  id: string;
  title: string;
  videoUrl: string;
}

interface ShowroomVideosManagerProps {
  showroomId: string;
  videos: ShowroomVideoItem[];
}

/**
 * Add/remove UI for a showroom's own YouTube videos (one-to-many, shown as
 * a grid on the public detail page) — separate from the surrounding
 * ShowroomProfileForm's own single-submit flow, since each video is its
 * own row with its own create/delete action, not a field on that form.
 * Uses router.refresh() after a successful add/delete rather than
 * maintaining local optimistic state, same convention as
 * ShowroomProfileForm's own post-logo-upload refresh.
 */
export function ShowroomVideosManager({ showroomId, videos }: ShowroomVideosManagerProps) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addPending, startAddTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setTitleError(null);
    setUrlError(null);

    const titleParsed = showroomVideoFieldSchemas.title.safeParse(title);
    const urlParsed = showroomVideoFieldSchemas.videoUrl.safeParse(videoUrl);
    let hasError = false;
    if (!titleParsed.success) {
      setTitleError(titleParsed.error.issues[0]?.message ?? "Invalid title.");
      hasError = true;
    }
    if (!urlParsed.success) {
      setUrlError(urlParsed.error.issues[0]?.message ?? "Invalid video URL.");
      hasError = true;
    }
    if (hasError) return;

    startAddTransition(async () => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("videoUrl", videoUrl);
      const result = await createShowroomVideoAction(showroomId, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setTitle("");
      setVideoUrl("");
      toast.success("Video added.");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startDeleteTransition(async () => {
      const result = await deleteShowroomVideoAction(id);
      if (result.error) {
        toast.error(result.error);
        setDeletingId(null);
        return;
      }
      toast.success("Video removed.");
      router.refresh();
    });
  }

  return (
    <div>
      {videos.length === 0 ? (
        <p className="text-sm text-neutral-400">No videos added yet.</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {videos.map((video) => {
            const thumbnailUrl = getYouTubeThumbnailUrl(video.videoUrl);
            return (
              <li key={video.id} className="flex items-center gap-3 rounded-md border border-neutral-200 p-2.5">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- YouTube-hosted thumbnail, no build-time-known dimensions
                  <img src={thumbnailUrl} alt="" className="h-11 w-16 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-11 w-16 shrink-0 rounded bg-neutral-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{video.title}</p>
                  <p className="truncate text-xs text-neutral-400">{video.videoUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(video.id)}
                  disabled={deletePending && deletingId === video.id}
                  title="Remove video"
                  className="shrink-0 rounded-md p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <TrashIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 rounded-md border border-dashed border-neutral-300 p-3.5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="showroom-video-title">Title</FieldLabel>
          <Input
            id="showroom-video-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Showroom Walkthrough"
            error={!!titleError}
          />
          {titleError && <p className="mt-1 text-sm text-red-600">{titleError}</p>}
        </div>
        <div>
          <FieldLabel htmlFor="showroom-video-url">Video URL</FieldLabel>
          <Input
            id="showroom-video-url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            error={!!urlError}
          />
          {urlError && <p className="mt-1 text-sm text-red-600">{urlError}</p>}
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={addPending}
            className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addPending ? "Adding…" : "Add video"}
          </button>
        </div>
      </form>
    </div>
  );
}
