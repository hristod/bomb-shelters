import { Shelter } from "@/types/shelter";

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findClosestShelter(
  lat: number, lng: number, shelters: Shelter[]
): Shelter | null {
  if (shelters.length === 0) return null;

  let closest = shelters[0];
  let minDist = haversineDistance(lat, lng, closest.lat, closest.lng);

  for (let i = 1; i < shelters.length; i++) {
    const dist = haversineDistance(lat, lng, shelters[i].lat, shelters[i].lng);
    if (dist < minDist) {
      minDist = dist;
      closest = shelters[i];
    }
  }

  return closest;
}

export function getNavigationUrl(
  originLat: number, originLng: number,
  destLat: number, destLng: number
): string {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    return `https://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=w`;
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=walking`;
}
