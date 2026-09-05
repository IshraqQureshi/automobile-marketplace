import { ShowroomIcon } from "@/components/admin/admin-ui";

export interface CertifiedShowroomItem {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface CertifiedShowroomsStripProps {
  showrooms: CertifiedShowroomItem[];
}

/**
 * Decorative strip — showroom detail pages (MKT-004) don't exist yet, so
 * these deliberately aren't links (no dead-end click targets), same
 * reasoning as the footer's own inert Brands/Model/Type columns.
 */
export function CertifiedShowroomsStrip({ showrooms }: CertifiedShowroomsStripProps) {
  if (showrooms.length === 0) return null;

  return (
    <section className="border-b border-neutral-200 bg-white py-3">
      <p className="mb-2 text-center text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">Certified showrooms</p>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 sm:px-6">
        {showrooms.map((showroom) => (
          <div key={showroom.id} className="flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5">
            {showroom.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- tiny decorative badge, not worth next/image's overhead for a strip that can repeat many rows
              <img src={showroom.logoUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <ShowroomIcon className="h-3 w-3" />
              </span>
            )}
            <span className="text-xs font-medium text-neutral-700">{showroom.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
