"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Shelter } from "@/types/shelter";
import { shelters } from "@/lib/shelters";
import LanguageToggle from "@/components/LanguageToggle";
import NavigateButton from "@/components/NavigateButton";
import CenterMapButton from "@/components/CenterMapButton";
import SearchButton from "@/components/SearchButton";
import BetaDisclaimer from "@/components/BetaDisclaimer";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<[number, number] | null>(null);

  return (
    <div className="h-dvh relative">
      <BetaDisclaimer />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
        <SearchButton onSearch={setFlyToLocation} />
      </div>
      <div className="absolute top-4 right-4 z-[1000]">
        <LanguageToggle />
      </div>
      <Map
        shelters={shelters}
        selectedShelter={selectedShelter}
        onMarkerClick={setSelectedShelter}
        flyToLocation={flyToLocation}
      />
      <div
        className="absolute left-4 right-4 z-[1000] flex flex-col items-end gap-3"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <CenterMapButton onLocate={setFlyToLocation} />
        <NavigateButton shelters={shelters} />
      </div>
    </div>
  );
}
