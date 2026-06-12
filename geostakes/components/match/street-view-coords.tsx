"use client";

import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/lib/use-google-maps";
import { STREET_VIEW_OPTIONS } from "@/lib/google-map-options";

/**
 * Renders Google Street View for given lat/lng coordinates.
 * Used in solo mode where we load street view directly from coordinates.
 */
export function StreetViewCoords({ lat, lng }: { lat: number; lng: number }) {
  const { ready, error } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    if (
      typeof google === "undefined" ||
      !google.maps?.StreetViewPanorama
    ) {
      return;
    }

    const panorama = new google.maps.StreetViewPanorama(
      containerRef.current,
      STREET_VIEW_OPTIONS,
    );

    panorama.setPosition({ lat, lng });
    panorama.setPov({ heading: 0, pitch: 0 });
    panorama.setZoom(0);
    panorama.setVisible(true);

    panoramaRef.current = panorama;

    return () => {
      // Stops any in-flight tile fetches; lets GC reclaim.
      panorama.setVisible(false);
      panoramaRef.current = null;
    };
  }, [ready, lat, lng]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-card text-muted-foreground text-sm px-6 text-center">
        Couldn&apos;t load Google Maps: {error.message}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-black"
      aria-label="Street View"
    />
  );
}
