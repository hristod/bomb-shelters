"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Shelter } from "@/types/shelter";
import { shelters } from "@/lib/shelters";
import LanguageToggle from "@/components/LanguageToggle";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);

  return (
    <div className="h-screen">
      <div className="absolute top-4 right-4 z-[1000]">
        <LanguageToggle />
      </div>
      <Map
        shelters={shelters}
        selectedShelter={selectedShelter}
        onMarkerClick={setSelectedShelter}
        flyToLocation={null}
      />
    </div>
  );
}
