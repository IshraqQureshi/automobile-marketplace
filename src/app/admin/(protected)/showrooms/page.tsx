import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { ShowroomList, type ShowroomListItem } from "@/components/admin/showroom-list";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Showrooms — HarakaGari Admin",
};

// PENDING sorts first (needs review), then APPROVED/SUSPENDED/REJECTED —
// within a status, oldest first so review happens roughly FIFO.
const STATUS_RANK: Record<string, number> = { PENDING: 0, APPROVED: 1, SUSPENDED: 2, REJECTED: 3 };

export default async function AdminShowroomsPage() {
  const supabase = await createClient();

  const [showroomsResult, documentsResult] = await Promise.all([
    supabase.from("showrooms").select("id, business_name, email, phone, city, address, description, status, created_at"),
    supabase.from("showroom_documents").select("id, showroom_id, document_type, storage_path, status, created_at").order("created_at"),
  ]);

  for (const [label, result] of [
    ["showrooms", showroomsResult],
    ["showroom documents", documentsResult],
  ] as const) {
    if (result.error) {
      logger.error(`Admin showrooms: failed to load ${label}`, result.error);
    }
  }

  const documentsByShowroom = new Map<string, ShowroomListItem["documents"]>();
  for (const doc of documentsResult.data ?? []) {
    const list = documentsByShowroom.get(doc.showroom_id) ?? [];
    list.push({ id: doc.id, documentType: doc.document_type, storagePath: doc.storage_path, status: doc.status, createdAt: doc.created_at });
    documentsByShowroom.set(doc.showroom_id, list);
  }

  const items: ShowroomListItem[] = (showroomsResult.data ?? [])
    .map((showroom) => ({
      id: showroom.id,
      businessName: showroom.business_name,
      email: showroom.email,
      phone: showroom.phone,
      city: showroom.city,
      address: showroom.address,
      description: showroom.description,
      status: showroom.status,
      createdAt: showroom.created_at,
      documents: documentsByShowroom.get(showroom.id) ?? [],
    }))
    .sort((a, b) => {
      const rankDiff = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
      if (rankDiff !== 0) return rankDiff;
      return a.createdAt.localeCompare(b.createdAt);
    });

  return (
    <>
      <AdminTopbar title="Showrooms" />
      <main className="flex-1 px-7 py-6">
        <ShowroomList items={items} />
      </main>
    </>
  );
}
