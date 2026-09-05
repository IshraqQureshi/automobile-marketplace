import Image from "next/image";
import { CarIcon } from "@/components/admin/admin-ui";

export interface PopularModelItem {
  key: string;
  make: string;
  model: string;
  listingCount: number;
  photoUrl: string | null;
}

interface PopularModelsProps {
  models: PopularModelItem[];
}

export function PopularModels({ models }: PopularModelsProps) {
  if (models.length === 0) return null;

  return (
    <section className="border-t border-neutral-200 bg-neutral-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-neutral-900">Popular Models</h2>
          <button type="button" disabled title="Coming soon" className="text-sm font-medium text-brand disabled:cursor-not-allowed disabled:opacity-60">
            All models →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {models.map((model) => (
            <div key={model.key} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex h-24 items-center justify-center bg-neutral-100">
                {model.photoUrl ? (
                  <Image src={model.photoUrl} alt="" width={160} height={96} unoptimized className="h-full w-full object-cover" />
                ) : (
                  <CarIcon />
                )}
              </div>
              <div className="p-3">
                <p className="text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">{model.make}</p>
                <p className="truncate text-sm font-medium text-neutral-900">{model.model}</p>
                <p className="text-xs text-neutral-400 tabular-nums">{model.listingCount} listings</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
