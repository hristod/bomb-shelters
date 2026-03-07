"use client";
import { Navigation } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useGeolocation } from "@/lib/useGeolocation";
import { findClosestShelter, getNavigationUrl } from "@/lib/geo-utils";
import { shelters } from "@/lib/shelters";

export default function NavigateButton() {
  const { t } = useI18n();
  const { lat, lng, error, loading, requestLocation } = useGeolocation();

  const handleClick = () => {
    if (lat !== null && lng !== null) {
      const closest = findClosestShelter(lat, lng, shelters);
      if (closest) {
        const url = getNavigationUrl(lat, lng, closest.lat, closest.lng);
        window.open(url, "_blank", "noopener");
      }
      return;
    }

    if (error) {
      alert(t("locationRequired"));
      return;
    }

    requestLocation();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-lg rounded-xl shadow-lg transition-colors duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-wait min-h-[56px] md:min-h-[48px] px-4 py-3 focus:outline-none focus:ring-4 focus:ring-red-300"
      aria-label={t("navigateToShelter")}
    >
      <Navigation className="w-5 h-5" />
      {loading ? t("locating") : t("navigateToShelter")}
    </button>
  );
}
