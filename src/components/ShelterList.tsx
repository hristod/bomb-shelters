"use client";
import { useMemo } from "react";
import { Shelter } from "@/types/shelter";
import { useI18n } from "@/lib/i18n";
import SearchBar from "./SearchBar";
import Filters from "./Filters";
import ShelterCard from "./ShelterCard";

interface ShelterListProps {
  shelters: Shelter[];
  selectedShelter: Shelter | null;
  onSelectShelter: (shelter: Shelter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  region: string;
  type: string;
  category: string;
  onRegionChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export default function ShelterList({
  shelters,
  selectedShelter,
  onSelectShelter,
  search,
  onSearchChange,
  region,
  type,
  category,
  onRegionChange,
  onTypeChange,
  onCategoryChange,
}: ShelterListProps) {
  const { t } = useI18n();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return shelters.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.address.toLowerCase().includes(q)) return false;
      if (region && s.region !== region) return false;
      if (type && s.type !== type) return false;
      if (category && s.category !== category) return false;
      return true;
    });
  }, [shelters, search, region, type, category]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-slate-200">
        <SearchBar value={search} onChange={onSearchChange} />
        <Filters
          region={region} type={type} category={category}
          onRegionChange={onRegionChange} onTypeChange={onTypeChange} onCategoryChange={onCategoryChange}
        />
        <p className="text-xs text-slate-500">
          {filtered.length} {t("sheltersFound")}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.map((shelter) => (
          <ShelterCard
            key={shelter.id}
            shelter={shelter}
            isSelected={selectedShelter?.id === shelter.id}
            onClick={() => onSelectShelter(shelter)}
          />
        ))}
      </div>
    </div>
  );
}
