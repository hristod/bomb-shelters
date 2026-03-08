"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Shelter } from "@/types/shelter";
import { shelters } from "@/lib/shelters";
import LanguageToggle from "@/components/LanguageToggle";
import NavigateButton from "@/components/NavigateButton";
import CenterMapButton from "@/components/CenterMapButton";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<[number, number] | null>(null);

  return (
    <div className="h-screen relative">
      <div className="absolute top-4 right-4 z-[1000]">
        <LanguageToggle />
      </div>
      <Map
        shelters={shelters}
        selectedShelter={selectedShelter}
        onMarkerClick={setSelectedShelter}
        flyToLocation={flyToLocation}
      />
      <div className="absolute bottom-4 right-4 z-[1000]">
        <CenterMapButton onLocate={setFlyToLocation} />
      </div>
      <div className="absolute bottom-4 left-4 right-16 z-[1000]">
        <NavigateButton shelters={shelters} />
      </div>
    </div>
  );
}
