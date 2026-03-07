"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Shelter } from "@/types/shelter";
import { shelters } from "@/lib/shelters";
import ShelterList from "@/components/ShelterList";
import BottomSheet, { SNAP_COLLAPSED, SNAP_HALF } from "@/components/BottomSheet";
import LanguageToggle from "@/components/LanguageToggle";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [snapPoint, setSnapPoint] = useState(SNAP_HALF);

  const handleSelectFromList = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    setSnapPoint(SNAP_COLLAPSED);
  };

  const handleMarkerClick = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    setSnapPoint(SNAP_HALF);
  };

  const listProps = {
    shelters,
    selectedShelter,
    search,
    onSearchChange: setSearch,
    region,
    type,
    category,
    onRegionChange: setRegion,
    onTypeChange: setType,
    onCategoryChange: setCategory,
  };

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[360px] md:flex-shrink-0 md:flex-col md:border-r md:border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-end">
          <LanguageToggle />
        </div>
        <ShelterList {...listProps} onSelectShelter={setSelectedShelter} />
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        <div className="absolute top-4 right-4 z-[1000] md:hidden">
          <LanguageToggle />
        </div>
        <Map
          shelters={shelters}
          selectedShelter={selectedShelter}
          onMarkerClick={handleMarkerClick}
        />
      </main>

      {/* Mobile bottom sheet */}
      <BottomSheet snapPoint={snapPoint} onSnapChange={setSnapPoint}>
        <ShelterList {...listProps} onSelectShelter={handleSelectFromList} />
      </BottomSheet>
    </div>
  );
}
