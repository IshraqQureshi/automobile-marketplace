"use client";

import Image from "next/image";
import { useState } from "react";
import { CarIcon } from "@/components/admin/admin-ui";
import type { VehiclePhoto } from "@/features/vehicle/types";

interface VehicleGalleryProps {
  photos: VehiclePhoto[];
  title: string;
}

export function VehicleGallery({ photos, title }: VehicleGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[10px] bg-neutral-200">
        <CarIcon />
      </div>
    );
  }

  const activePhoto = photos[Math.min(activeIndex, photos.length - 1)]!;

  function goTo(index: number) {
    setActiveIndex(((index % photos.length) + photos.length) % photos.length);
  }

  return (
    <div>
      <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-[10px] bg-neutral-200">
        <Image src={activePhoto.url} alt={title} fill unoptimized className="object-cover" priority />
        {photos.length > 1 && (
          <>
            <span className="absolute right-3 bottom-3 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: "rgba(0,0,0,0.62)" }}>
              {activeIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next photo"
              className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`View photo ${index + 1}`}
              aria-current={index === activeIndex}
              className="h-14.5 w-22 shrink-0 overflow-hidden rounded-md border-2 transition-opacity"
              style={{
                borderColor: index === activeIndex ? "#007f77" : "transparent",
                outline: index === activeIndex ? undefined : "1px solid rgb(229,231,235)",
                opacity: index === activeIndex ? 1 : 0.72,
              }}
            >
              <Image src={photo.url} alt="" width={88} height={58} unoptimized className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
