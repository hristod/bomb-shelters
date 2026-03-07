"use client";
import { useI18n } from "@/lib/i18n";
import { regions, shelterTypes, categories } from "@/lib/shelters";

interface FiltersProps {
  region: string;
  type: string;
  category: string;
  onRegionChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px] cursor-pointer"
    >
      <option value="">{allLabel}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export default function Filters({ region, type, category, onRegionChange, onTypeChange, onCategoryChange }: FiltersProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-2">
      <Select label={t("region")} value={region} onChange={onRegionChange} options={regions} allLabel={t("allRegions")} />
      <Select label={t("type")} value={type} onChange={onTypeChange} options={shelterTypes} allLabel={t("allTypes")} />
      <Select label={t("category")} value={category} onChange={onCategoryChange} options={categories} allLabel={t("allCategories")} />
    </div>
  );
}
