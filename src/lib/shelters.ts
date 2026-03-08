import { Shelter } from "@/types/shelter";
import data from "../../public/data/shelters.json";

export const shelters: Shelter[] = (data as any[]).filter(
  (s): s is Shelter => s.lat !== null && s.lng !== null
);

