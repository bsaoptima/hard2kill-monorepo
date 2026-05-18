"use client";

import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/lib/use-google-maps";
import { createMapPolyline } from "@/lib/create-map-polyline";
import { RESULT_MAP_OPTIONS } from "@/lib/google-map-options";

const YOU_COLOR = "#ff2e2e";
const OPPONENT_COLOR = "#3aa0ff";
const TRUTH_COLOR = "#39ff14";

type LatLng = { lat: number; lng: number };

type Props = {
  yourGuess: LatLng | null;
  opponentGuess: LatLng | null;
  truth: LatLng;
  /** When true, fits all rounds' guesses + truths (for final results). */
  showAllRounds?: boolean;
  /** All rounds' truths and both players' guesses, indexed by roundNumber. */
  allRounds?: Array<{
    truth: LatLng;
    yourGuess: LatLng | null;
    opponentGuess: LatLng | null;
  }>;
};

function makeMarkerIcon(color: string, scale = 8): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

/**
 * Full-screen map showing truth + both players' guesses with dotted polylines
 * to truth. Mirrors geohub/components/ResultMap, adapted for 1v1 (two guess
 * markers per round + per-round color coding).
 */
export function ResultMap({
  yourGuess,
  opponentGuess,
  truth,
  showAllRounds,
  allRounds,
}: Props) {
  const { ready } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Init map once.
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;

    mapRef.current = new google.maps.Map(containerRef.current, {
      ...RESULT_MAP_OPTIONS,
      center: { lat: 0, lng: 0 },
      zoom: 2,
    });
  }, [ready]);

  // Redraw on prop change.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    polylinesRef.current.forEach((p) => p.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    function placeRound(
      r: { truth: LatLng; yourGuess: LatLng | null; opponentGuess: LatLng | null },
      truthScale = 10,
    ) {
      markersRef.current.push(
        new google.maps.Marker({
          map: map!,
          position: r.truth,
          icon: makeMarkerIcon(TRUTH_COLOR, truthScale),
          title: "Actual location",
          zIndex: 3,
        }),
      );
      bounds.extend(r.truth);

      if (r.yourGuess) {
        markersRef.current.push(
          new google.maps.Marker({
            map: map!,
            position: r.yourGuess,
            icon: makeMarkerIcon(YOU_COLOR),
            title: "Your guess",
            zIndex: 2,
          }),
        );
        polylinesRef.current.push(
          createMapPolyline(r.yourGuess, r.truth, map!, YOU_COLOR),
        );
        bounds.extend(r.yourGuess);
      }

      if (r.opponentGuess) {
        markersRef.current.push(
          new google.maps.Marker({
            map: map!,
            position: r.opponentGuess,
            icon: makeMarkerIcon(OPPONENT_COLOR),
            title: "Opponent's guess",
            zIndex: 1,
          }),
        );
        polylinesRef.current.push(
          createMapPolyline(r.opponentGuess, r.truth, map!, OPPONENT_COLOR),
        );
        bounds.extend(r.opponentGuess);
      }
    }

    if (showAllRounds && allRounds) {
      allRounds.forEach((r) => placeRound(r, 8));
    } else {
      placeRound({ truth, yourGuess, opponentGuess });
    }

    if (!bounds.isEmpty()) {
      const fit = () => map.fitBounds(bounds, 80);
      // Fit once map is idle (initial render) and again now (subsequent renders).
      google.maps.event.addListenerOnce(map, "idle", fit);
      fit();
    }
  }, [ready, yourGuess, opponentGuess, truth, showAllRounds, allRounds]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-secondary"
      aria-label="Result map"
    />
  );
}
