import Image from "next/image";
import Link from "next/link";
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
    <section className="border-t border-neutral-200 bg-[#f8f9fa] px-6 py-12 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold text-neutral-900">Popular Models</h2>
          <Link href="/listing" className="text-sm font-medium text-brand hover:text-brand-dark">
            All models →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {models.map((model) => (
            <Link
              key={model.key}
              href={`/listing?make=${encodeURIComponent(model.make)}&model=${encodeURIComponent(model.model)}`}
              className="overflow-hidden rounded-lg border border-neutral-200 bg-white no-underline"
            >
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
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
