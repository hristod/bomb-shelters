"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Shelter } from "@/types/shelter";
import { useI18n } from "@/lib/i18n";
import { useUserback } from "@/lib/userback";
import { useEffect } from "react";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyToMarker({ shelter }: { shelter: Shelter | null }) {
  const map = useMap();
  useEffect(() => {
    if (shelter) {
      map.flyTo([shelter.lat, shelter.lng], 16, { duration: 1 });
    }
  }, [shelter, map]);
  return null;
}

interface MapProps {
  shelters: Shelter[];
  selectedShelter: Shelter | null;
  onMarkerClick: (shelter: Shelter) => void;
}

export default function Map({ shelters, selectedShelter, onMarkerClick }: MapProps) {
  const { t } = useI18n();
  const userback = useUserback();

  return (
    <MapContainer
      center={[42.7, 25.5]}
      zoom={7}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToMarker shelter={selectedShelter} />
      {shelters.map((shelter) => (
        <Marker
          key={shelter.id}
          position={[shelter.lat, shelter.lng]}
          icon={defaultIcon}
          eventHandlers={{ click: () => onMarkerClick(shelter) }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{shelter.name}</p>
              <p className="text-slate-500">{shelter.address}</p>
              <p className="mt-1">{t("type")}: {shelter.type}</p>
              <p>{t("condition")}: {shelter.category}</p>
              {userback && (
                <button
                  className="mt-2 text-xs text-orange-500 hover:text-orange-600 underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    userback.setData({
                      shelter_id: String(shelter.id),
                      shelter_name: shelter.name,
                      shelter_address: shelter.address,
                      shelter_region: shelter.region,
                      lat: String(shelter.lat),
                      lng: String(shelter.lng),
                    });
                    userback.open("bug", "form");
                  }}
                >
                  {t("reportProblem")}
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
