import { Shelter } from "@/types/shelter";
import data from "../../public/data/shelters.json";

export const shelters: Shelter[] = (data as any[]).filter(
  (s): s is Shelter => s.lat !== null && s.lng !== null
);

export const regions = [...new Set(shelters.map((s) => s.region))].sort();
export const shelterTypes = [...new Set(shelters.map((s) => s.type))].sort();
export const categories = [...new Set(shelters.map((s) => s.category))].sort();
