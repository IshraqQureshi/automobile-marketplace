import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { HomepageHighlightsList, type HighlightItem } from "@/components/admin/homepage-highlights-list";
import { createHighlightAction, deleteHighlightAction, updateHighlightAction, updateSocialLinksAction } from "@/features/admin/homepage-highlights-actions";
import { getSystemSettingString } from "@/lib/system-settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Homepage Highlights — HarakaGari Admin",
};

export default async function AdminHighlightsPage() {
  const supabase = await createClient();

  const [{ data: highlights }, tiktokProfileUrl, youtubeChannelUrl] = await Promise.all([
    supabase.from("homepage_highlights").select("id, platform, title, video_url, thumbnail_storage_path, sort_order, is_active").order("sort_order"),
    getSystemSettingString(supabase, "homepage_tiktok_profile_url"),
    getSystemSettingString(supabase, "homepage_youtube_channel_url"),
  ]);

  const items: HighlightItem[] = (highlights ?? []).map((row) => ({
    id: row.id,
    platform: row.platform,
    title: row.title,
    videoUrl: row.video_url,
    thumbnailUrl: supabase.storage.from("homepage-highlights").getPublicUrl(row.thumbnail_storage_path).data.publicUrl,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));

  return (
    <>
      <AdminTopbar title="Homepage Highlights" />
      <main className="flex-1 px-7 py-6">
        <HomepageHighlightsList
          items={items}
          socialLinks={{ tiktokProfileUrl, youtubeChannelUrl }}
          onCreate={createHighlightAction}
          onUpdate={updateHighlightAction}
          onDelete={deleteHighlightAction}
          onUpdateSocialLinks={updateSocialLinksAction}
        />
      </main>
    </>
  );
}
