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
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-neutral-100">
        <CarIcon />
      </div>
    );
  }

  const activePhoto = photos[Math.min(activeIndex, photos.length - 1)]!;

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
        <Image src={activePhoto.url} alt={title} fill unoptimized className="object-cover" priority />
        {photos.length > 1 && (
          <span className="absolute right-3 bottom-3 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
            {activeIndex + 1} / {photos.length}
          </span>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View photo ${index + 1}`}
              aria-current={index === activeIndex}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 ${
                index === activeIndex ? "border-brand" : "border-transparent"
              }`}
            >
              <Image src={photo.url} alt="" fill unoptimized className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
