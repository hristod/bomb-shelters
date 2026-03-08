"use client";
import { Navigation } from "lucide-react";
import { Shelter } from "@/types/shelter";
import { useI18n } from "@/lib/i18n";
import {
  getCurrentPosition,
  findClosestShelter,
  getNavigationUrl,
} from "@/lib/geolocation";

interface NavigateButtonProps {
  shelters: Shelter[];
}

export default function NavigateButton({ shelters }: NavigateButtonProps) {
  const { t } = useI18n();

  const handleClick = async () => {
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;
      const closest = findClosestShelter(latitude, longitude, shelters);
      const url = getNavigationUrl(latitude, longitude, closest.lat, closest.lng);
      window.location.href = url;
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
      className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm md:text-lg py-4 px-4 rounded-lg shadow-lg transition-colors duration-200 cursor-pointer min-h-[56px] focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 whitespace-nowrap"
      aria-label={t("navigateToNearest")}
    >
      <Navigation className="w-5 h-5" />
      {t("navigateToNearest")}
    </button>
  );
}
