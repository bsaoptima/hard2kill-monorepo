// Ported from geohub/utils/helpers/createMapPolyline.ts.
// Renders a "dotted line" between two points using an invisible polyline
// with a repeating dot icon — looks much better than a solid stroke.

type LatLng = { lat: number; lng: number };

export function createMapPolyline(
  from: LatLng,
  to: LatLng,
  map: google.maps.Map,
  color = "#ffffff",
): google.maps.Polyline {
  const lineSymbol: google.maps.Symbol = {
    path: "M 0,-1 0,1",
    strokeOpacity: 1,
    strokeColor: color,
    scale: 1.75,
  };

  return new google.maps.Polyline({
    path: [from, to],
    map,
    clickable: false,
    strokeOpacity: 0,
    icons: [{ icon: lineSymbol, offset: "0", repeat: "10px" }],
  });
}
