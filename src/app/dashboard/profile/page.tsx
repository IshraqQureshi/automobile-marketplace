import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShowroomProfileForm } from "@/components/dashboard/showroom-profile-form";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";
import { stripKenyaPrefix } from "@/lib/validation/kenya-phone";

export const metadata: Metadata = {
  title: "Showroom profile — HarakaGari",
};

export default async function DashboardProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Any showroom status can edit their profile — this isn't an
  // approved-only gate like vehicle management (SHR-004); a PENDING
  // showroom should still be able to correct their submitted details
  // while awaiting review.
  const showroom = await getOwnerShowroom(user.id);
  if (!showroom) redirect("/ready-to-sell");

  const [{ data: full }, { data: videoRows }] = await Promise.all([
    supabase
      .from("showrooms")
      .select("business_name, city, phone, email, address, description, logo_storage_path, opening_hours, youtube_channel_url")
      .eq("id", showroom.id)
      .single(),
    supabase.from("showroom_videos").select("id, title, video_url").eq("showroom_id", showroom.id).order("sort_order", { ascending: true }),
  ]);

  const logoUrl = full?.logo_storage_path ? supabase.storage.from("showroom-logos").getPublicUrl(full.logo_storage_path).data.publicUrl : null;
  const videos = (videoRows ?? []).map((row) => ({ id: row.id, title: row.title, videoUrl: row.video_url }));

  return (
    <div className="mx-auto max-w-2xl p-7">
      <Link href="/dashboard" className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 mb-6 font-display text-xl font-semibold text-neutral-900">Showroom profile</h1>
      <ShowroomProfileForm
        showroomId={showroom.id}
        initialValues={{
          businessName: full?.business_name ?? "",
          location: full?.city ?? "",
          businessPhone: full?.phone ? stripKenyaPrefix(full.phone) : "",
          businessEmail: full?.email ?? "",
          address: full?.address ?? "",
          description: full?.description ?? "",
          openingHours: typeof full?.opening_hours === "string" ? full.opening_hours : "",
          youtubeChannelUrl: full?.youtube_channel_url ?? "",
          logoUrl,
        }}
        videos={videos}
      />
    </div>
  );
}
