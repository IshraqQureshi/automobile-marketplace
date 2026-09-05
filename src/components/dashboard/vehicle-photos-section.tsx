"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { FieldLabel, RowIconButton, TrashIcon } from "@/components/admin/admin-ui";
import { useToast } from "@/components/ui/toast";
import { deleteVehiclePhotoAction, setPrimaryVehiclePhotoAction, uploadVehiclePhotosAction } from "@/features/vehicle/actions";
import type { VehiclePhoto } from "@/features/vehicle/types";

interface VehiclePhotosSectionProps {
  vehicleId: string;
  photos: VehiclePhoto[];
}

/**
 * Photo Gallery + Featured Image (SHR-008) — an always-visible section on
 * the vehicle edit page rather than a separate popup, matching the same
 * "avoid stacking dialogs for a complex form" reasoning that moved the main
 * vehicle form to its own page. Only reachable from the edit page: a photo
 * needs a real vehicle id for its storage path, so a brand-new vehicle (not
 * yet saved) has nowhere to upload to.
 */
export function VehiclePhotosSection({ vehicleId, photos }: VehiclePhotosSectionProps) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const primary = photos.find((p) => p.isPrimary);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("photos", file);
    }

    startTransition(async () => {
      const result = await uploadVehiclePhotosAction(vehicleId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Photos uploaded.");
      }
      e.target.value = "";
    });
  }

  function handleSetPrimary(mediaId: string) {
    startTransition(async () => {
      const result = await setPrimaryVehiclePhotoAction(mediaId);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete(mediaId: string) {
    startTransition(async () => {
      const result = await deleteVehiclePhotoAction(mediaId);
      if (result.error) toast.error(result.error);
      else toast.success("Photo removed.");
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-neutral-900">Photo gallery</h2>
      <p className="mt-0.5 text-sm text-neutral-500">
        {primary ? "The featured image is shown first on your listing." : "Upload photos — the first one becomes the featured image."}
      </p>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {photos.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">No photos uploaded yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative overflow-hidden rounded-md border border-neutral-200">
              <Image src={photo.url} alt="" width={200} height={140} unoptimized className="h-28 w-full object-cover" />
              {photo.isPrimary && (
                <span className="absolute top-1 left-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Featured
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-black/40 p-1">
                {!photo.isPrimary && (
                  <RowIconButton label="Set as featured image" onClick={() => handleSetPrimary(photo.id)} disabled={pending} variant="brand">
                    <CheckIconSmall />
                  </RowIconButton>
                )}
                <RowIconButton label="Delete photo" onClick={() => handleDelete(photo.id)} disabled={pending} variant="danger">
                  <TrashIcon />
                </RowIconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <FieldLabel htmlFor="vehicle-photo-upload">Upload photos</FieldLabel>
        <input
          id="vehicle-photo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={pending}
          onChange={handleUpload}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark"
        />
      </div>
    </div>
  );
}

function CheckIconSmall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
