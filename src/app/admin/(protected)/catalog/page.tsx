import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { CatalogBrandsList } from "@/components/admin/catalog-brands-list";
import { CatalogList } from "@/components/admin/catalog-list";
import { CatalogModelsList } from "@/components/admin/catalog-models-list";
import { LayersIcon } from "@/components/admin/catalog-ui";
import {
  createBrandAction,
  createModelAction,
  createVehicleTypeAction,
  deleteBrandAction,
  deleteModelAction,
  deleteVehicleTypeAction,
  updateBrandAction,
  updateModelAction,
  updateVehicleTypeAction,
} from "@/features/admin/catalog-actions";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Catalog — HarakaGari Admin",
};

export default async function AdminCatalogPage() {
  const supabase = await createClient();

  const [brandsResult, modelsResult, typesResult] = await Promise.all([
    supabase.from("brands").select("id, name, logo_storage_path").order("name"),
    supabase.from("models").select("id, name, brand_id, brands(name)").order("name"),
    supabase.from("vehicle_types").select("id, name").order("name"),
  ]);

  for (const [label, result] of [
    ["brands", brandsResult],
    ["models", modelsResult],
    ["vehicle types", typesResult],
  ] as const) {
    if (result.error) {
      logger.error(`Admin catalog: failed to load ${label}`, result.error);
    }
  }

  const brands = brandsResult.data ?? [];
  const brandModelCounts = new Map<string, number>();
  for (const model of modelsResult.data ?? []) {
    brandModelCounts.set(model.brand_id, (brandModelCounts.get(model.brand_id) ?? 0) + 1);
  }

  const brandItems = brands.map((brand) => {
    const count = brandModelCounts.get(brand.id) ?? 0;
    const logoUrl = brand.logo_storage_path
      ? supabase.storage.from("brand-logos").getPublicUrl(brand.logo_storage_path).data.publicUrl
      : null;
    return { id: brand.id, name: brand.name, meta: `${count} model${count === 1 ? "" : "s"}`, logoUrl };
  });

  const modelItems = (modelsResult.data ?? []).map((model) => ({
    id: model.id,
    name: model.name,
    brandId: model.brand_id,
    brandName: model.brands?.name ?? "Unknown brand",
  }));

  const typeItems = (typesResult.data ?? []).map((type) => ({ id: type.id, name: type.name }));

  return (
    <>
      <AdminTopbar title="Catalog" />
      <main className="flex-1 px-7 py-6">
        <div className="grid grid-cols-3 items-start gap-4 *:min-w-0">
          <CatalogBrandsList
            title="Brands"
            description="Vehicle manufacturers"
            items={brandItems}
            addPlaceholder="e.g. Toyota"
            emptyMessage="No brands yet."
            onCreate={createBrandAction}
            onUpdate={updateBrandAction}
            onDelete={deleteBrandAction}
            deleteWarning="This also deletes all of its models."
          />

          <CatalogModelsList
            items={modelItems}
            brands={brands}
            onCreate={createModelAction}
            onUpdate={updateModelAction}
            onDelete={deleteModelAction}
          />

          <CatalogList
            icon={<LayersIcon />}
            title="Types"
            description="Body / fuel category"
            items={typeItems}
            addPlaceholder="e.g. Sedan"
            emptyMessage="No types yet."
            onCreate={createVehicleTypeAction}
            onUpdate={updateVehicleTypeAction}
            onDelete={deleteVehicleTypeAction}
          />
        </div>
      </main>
    </>
  );
}
