"use client";
import { Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface SearchButtonProps {
  onSearch: (coords: [number, number]) => void;
}

export default function SearchButton({ onSearch }: SearchButtonProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        q: query,
        countrycodes: "bg",
        format: "json",
        limit: "1",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "User-Agent": "BombSheltersBulgaria/1.0" } }
      );
      const data = await res.json();

      if (data.length > 0) {
        onSearch([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setQuery("");
        setExpanded(false);
      } else {
        setError(t("addressNotFound"));
      }
    } catch {
      setError(t("addressNotFound"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setExpanded(false);
    setQuery("");
    setError("");
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center justify-center w-11 h-11 bg-white border border-slate-200 rounded-full shadow-sm hover:border-slate-300 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
        aria-label={t("searchPlaceholder")}
      >
        <Search className="w-5 h-5 text-slate-600" />
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError("");
          }}
          placeholder={t("searchPlaceholder")}
          className="w-56 sm:w-72 h-11 pl-4 pr-10 bg-white border border-slate-200 rounded-full shadow-sm text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          aria-label="Close search"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {error && (
        <span className="text-xs text-red-500 whitespace-nowrap">{error}</span>
      )}
    </form>
  );
}
