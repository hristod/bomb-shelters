import { Shelter } from "@/types/shelter";

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findClosestShelter(
  lat: number,
  lng: number,
  shelters: Shelter[]
): Shelter {
  let closest = shelters[0];
  let minDist = Infinity;
  for (const s of shelters) {
    const d = haversineDistance(lat, lng, s.lat, s.lng);
    if (d < minDist) {
      minDist = d;
      closest = s;
    }
  }
  return closest;
}

export function getNavigationUrl(
  userLat: number,
  userLng: number,
  destLat: number,
  destLng: number
): string {
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    return `https://maps.apple.com/?saddr=${userLat},${userLng}&daddr=${destLat},${destLng}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&travelmode=walking`;
}
