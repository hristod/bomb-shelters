"use client";
import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "bg" ? "en" : "bg")}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 transition-colors duration-200 cursor-pointer min-h-[44px] focus:outline-none focus:ring-2 focus:ring-orange-500"
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4" />
      {lang === "bg" ? "EN" : "BG"}
    </button>
  );
}
