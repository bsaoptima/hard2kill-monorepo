"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/lib/use-google-maps";
import { GUESS_MAP_OPTIONS } from "@/lib/google-map-options";

type LatLng = { lat: number; lng: number };

const COLLAPSED_SIZE = "min(15vw, 220px)";
const COLLAPSED_HEIGHT = "min(15vh, 180px)";
const EXPANDED_SIZE = "min(38vw, 560px)";
const EXPANDED_HEIGHT = "min(40vh, 460px)";

export function GuessMap({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (g: LatLng) => Promise<void> | void;
}) {
  const { ready } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Initialize map once.
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;

    mapRef.current = new google.maps.Map(containerRef.current, {
      ...GUESS_MAP_OPTIONS,
      center: { lat: 20, lng: 0 },
      zoom: 1,
    });

    mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || disabled) return;
      const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setGuess(point);

      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: e.latLng,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: "#ff2e2e",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      } else {
        markerRef.current.setPosition(e.latLng);
        markerRef.current.setMap(mapRef.current);
      }
    });
  }, [ready, disabled]);

  // Reset marker when round changes (disabled flips).
  useEffect(() => {
    if (!disabled) return;
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    setGuess(null);
  }, [disabled]);

  // Re-trigger Google's resize handler when size changes so it re-renders cleanly.
  const expanded = hovering || pinned || !!guess;
  useEffect(() => {
    if (mapRef.current) {
      google.maps.event.trigger(mapRef.current, "resize");
    }
  }, [expanded]);

  async function handleSubmit() {
    if (!guess || submitting || disabled) return;
    setSubmitting(true);
    try {
      await onSubmit(guess);
    } finally {
      setSubmitting(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    width: expanded ? EXPANDED_SIZE : COLLAPSED_SIZE,
    height: expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
  };

  return (
    <div
      className="absolute bottom-5 right-5 z-20 transition-all duration-200 ease-out flex flex-col gap-2"
      style={containerStyle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex items-center gap-1.5 self-end bg-black/60 rounded-t-sm px-2 py-1 text-[11px]">
        <button
          type="button"
          onClick={() => setPinned(!pinned)}
          className={`px-2 py-0.5 rounded-sm uppercase tracking-[0.06em] ${
            pinned
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={pinned ? "Unpin (collapse on leave)" : "Pin (stay expanded)"}
        >
          {pinned ? "Pinned" : "Pin"}
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 bg-card rounded-sm overflow-hidden cursor-crosshair"
      />

      <button
        type="button"
        disabled={!guess || disabled || submitting}
        onClick={handleSubmit}
        className="w-full bg-primary text-primary-foreground border-none p-3 rounded-sm text-sm font-bold uppercase tracking-[0.1em] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Submitting…"
          : disabled
            ? "Waiting for opponent…"
            : guess
              ? "Submit guess"
              : "Click the map to guess"}
      </button>
    </div>
  );
}
