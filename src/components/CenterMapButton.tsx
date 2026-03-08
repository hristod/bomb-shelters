"use client";
import { LocateFixed } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getCurrentPosition } from "@/lib/geolocation";

interface CenterMapButtonProps {
  onLocate: (coords: [number, number]) => void;
}

export default function CenterMapButton({ onLocate }: CenterMapButtonProps) {
  const { t } = useI18n();

  const handleClick = async () => {
    try {
      const pos = await getCurrentPosition();
      onLocate([pos.coords.latitude, pos.coords.longitude]);
    } catch (err: unknown) {
      const geoErr = err as { code?: number };
      if (geoErr.code === 1) {
        alert(t("locationRequired"));
      } else {
        alert(t("locationUnavailable"));
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center w-11 h-11 bg-white border border-slate-200 rounded-full shadow-sm hover:border-slate-300 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
      aria-label="Center map on my location"
    >
      <LocateFixed className="w-5 h-5 text-slate-600" />
    </button>
  );
}
