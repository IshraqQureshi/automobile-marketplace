import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "./admin";
import { createAnonClient, createTestUser, deleteTestUser, type TestUser } from "./test-helpers";

// Requires a running local Supabase instance (npx supabase start). Verifies
// the showroom_videos RLS policies from
// supabase/migrations/20260907020000_create_showroom_videos.sql — a new
// owner-managed one-to-many table for a showroom's own YouTube videos.
describe("showroom_videos RLS authorization (integration)", () => {
  const admin = createAdminClient();
  const anon = createAnonClient();
  const testId = Date.now();

  let ownerA: TestUser;
  let ownerB: TestUser;
  let approvedShowroomA: string;
  let pendingShowroomB: string;

  beforeAll(async () => {
    ownerA = await createTestUser();
    ownerB = await createTestUser();

    const { data: sA, error: errA } = await admin
      .from("showrooms")
      .insert({
        owner_user_id: ownerA.id,
        business_name: `Test Video Showroom A ${testId}`,
        phone: "+254712345670",
        email: `video-showroom-a-${testId}@example.com`,
        status: "APPROVED",
      })
      .select("id")
      .single();
    if (errA || !sA) throw errA ?? new Error("showroom A not created");
    approvedShowroomA = sA.id;

    const { data: sB, error: errB } = await admin
      .from("showrooms")
      .insert({
        owner_user_id: ownerB.id,
        business_name: `Test Video Showroom B ${testId}`,
        phone: "+254712345671",
        email: `video-showroom-b-${testId}@example.com`,
        status: "PENDING",
      })
      .select("id")
      .single();
    if (errB || !sB) throw errB ?? new Error("showroom B not created");
    pendingShowroomB = sB.id;
  });

  afterAll(async () => {
    await admin.from("showrooms").delete().in("id", [approvedShowroomA, pendingShowroomB]);
    await deleteTestUser(ownerA.id);
    await deleteTestUser(ownerB.id);
  });

  it("an owner can insert a video for their own showroom", async () => {
    const { data, error } = await ownerA.client
      .from("showroom_videos")
      .insert({ showroom_id: approvedShowroomA, title: "Test Video", video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    if (data) await admin.from("showroom_videos").delete().eq("id", data.id);
  });

  it("an owner cannot insert a video for a showroom they don't own", async () => {
    const { error } = await ownerA.client
      .from("showroom_videos")
      .insert({ showroom_id: pendingShowroomB, title: "Test Video", video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    expect(error).not.toBeNull();
  });

  describe("with an owner-A video", () => {
    let videoId: string;

    beforeAll(async () => {
      const { data, error } = await admin
        .from("showroom_videos")
        .insert({ showroom_id: approvedShowroomA, title: "Owner A Video", video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("video not created");
      videoId = data.id;
    });

    afterAll(async () => {
      await admin.from("showroom_videos").delete().eq("id", videoId);
    });

    it("owner B cannot delete owner A's video (RLS silently filters, 0 rows)", async () => {
      const { data, error } = await ownerB.client.from("showroom_videos").delete().eq("id", videoId).select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: stillExists } = await admin.from("showroom_videos").select("id").eq("id", videoId).maybeSingle();
      expect(stillExists).not.toBeNull();
    });

    it("owner A can delete their own video", async () => {
      const { data, error } = await ownerA.client.from("showroom_videos").delete().eq("id", videoId).select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe("public visibility requires an APPROVED showroom", () => {
    let videoOnApprovedId: string;
    let videoOnPendingId: string;

    beforeAll(async () => {
      const { data: onApproved, error: errApproved } = await admin
        .from("showroom_videos")
        .insert({ showroom_id: approvedShowroomA, title: "Public Video", video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
        .select("id")
        .single();
      if (errApproved || !onApproved) throw errApproved ?? new Error("video not created");
      videoOnApprovedId = onApproved.id;

      const { data: onPending, error: errPending } = await admin
        .from("showroom_videos")
        .insert({ showroom_id: pendingShowroomB, title: "Not Yet Public Video", video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
        .select("id")
        .single();
      if (errPending || !onPending) throw errPending ?? new Error("video not created");
      videoOnPendingId = onPending.id;
    });

    afterAll(async () => {
      await admin.from("showroom_videos").delete().in("id", [videoOnApprovedId, videoOnPendingId]);
    });

    it("a signed-out visitor can see a video on an APPROVED showroom", async () => {
      const { data } = await anon.from("showroom_videos").select("id").eq("id", videoOnApprovedId).maybeSingle();
      expect(data).not.toBeNull();
    });

    it("a signed-out visitor cannot see a video on a non-APPROVED showroom", async () => {
      const { data } = await anon.from("showroom_videos").select("id").eq("id", videoOnPendingId).maybeSingle();
      expect(data).toBeNull();
    });

    it("owner B (unapproved showroom) can still see their own video", async () => {
      const { data } = await ownerB.client.from("showroom_videos").select("id").eq("id", videoOnPendingId).maybeSingle();
      expect(data).not.toBeNull();
    });
  });
});
