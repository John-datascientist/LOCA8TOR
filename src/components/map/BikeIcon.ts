import L from 'leaflet';

// DB values stay 'bike'/'car'/'bus'/'truck' (unchanged, to avoid a data
// migration) but map to real Nigerian delivery vehicle categories on
// screen: 'car' displays as Motorcycle, 'bus' displays as Van.
export type VehicleType = 'bike' | 'car' | 'bus' | 'truck';

const VEHICLE_EMOJI: Record<VehicleType, string> = {
  bike: '🚴',
  car: '🏍️',
  bus: '🚐',
  truck: '🚚',
};

function vehicleSvg(type: VehicleType): string {
  const emoji = VEHICLE_EMOJI[type] || '🚴';
  return `<div style="
    width:44px;height:44px;border-radius:50%;
    background:hsl(142,76%,36%);border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
    font-size:22px;line-height:1;
  ">${emoji}</div>`;
}

const BIKE_SVG = vehicleSvg('bike');

const PICKUP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
  <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="hsl(221, 83%, 53%)" stroke="white" stroke-width="2"/>
  <circle cx="16" cy="16" r="7" fill="white"/>
  <text x="16" y="20" text-anchor="middle" fill="hsl(221, 83%, 53%)" font-size="12" font-weight="bold">P</text>
</svg>`;

const DROPOFF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
  <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="hsl(0, 84%, 60%)" stroke="white" stroke-width="2"/>
  <circle cx="16" cy="16" r="7" fill="white"/>
  <text x="16" y="20" text-anchor="middle" fill="hsl(0, 84%, 60%)" font-size="12" font-weight="bold">D</text>
</svg>`;

export const bikeIcon = L.divIcon({
  html: BIKE_SVG,
  className: 'bike-marker',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

export function vehicleIcon(type: VehicleType | string | null | undefined) {
  const key = (type as VehicleType) in VEHICLE_EMOJI ? (type as VehicleType) : 'bike';
  return L.divIcon({
    html: vehicleSvg(key),
    className: 'bike-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export const pickupIcon = L.divIcon({
  html: PICKUP_SVG,
  className: 'location-marker',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

export const dropoffIcon = L.divIcon({
  html: DROPOFF_SVG,
  className: 'location-marker',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});
