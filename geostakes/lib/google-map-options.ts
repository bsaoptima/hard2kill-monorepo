// Ported from geohub/utils/constants/googleMapOptions.ts.
// Trimmed: dropped streak/streetview-options (require gameSettings model)
// and the broken `'#on'` style (Google Maps API doesn't accept it).

export const GUESS_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: "greedy",
  minZoom: 1,
  draggableCursor: "crosshair",
};

export const RESULT_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: "greedy",
  minZoom: 2,
};

export const STREET_VIEW_OPTIONS: google.maps.StreetViewPanoramaOptions = {
  addressControl: false,
  panControl: true,
  motionTracking: false,
  motionTrackingControl: false,
  enableCloseButton: false,
  zoomControl: false,
  fullscreenControl: false,
  showRoadLabels: false,
  // v0 = "moving" rules: clickToGo + scrollwheel + linksControl all on.
  clickToGo: true,
  scrollwheel: true,
  linksControl: true,
};
