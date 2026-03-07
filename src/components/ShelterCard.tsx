"use client";
import { MapPin } from "lucide-react";
import { Shelter } from "@/types/shelter";

interface ShelterCardProps {
  shelter: Shelter;
  isSelected: boolean;
  onClick: () => void;
}

export default function ShelterCard({ shelter, isSelected, onClick }: ShelterCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors duration-200 cursor-pointer min-h-[44px] focus:outline-none focus:ring-2 focus:ring-orange-500 ${
        isSelected
          ? "border-orange-500 bg-orange-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
      aria-label={shelter.name}
    >
      <p className="font-medium text-sm truncate">{shelter.name}</p>
      <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
        <span className="truncate">{shelter.address}</span>
      </p>
      <p className="text-xs text-slate-400 mt-1">{shelter.category}</p>
    </button>
  );
}
