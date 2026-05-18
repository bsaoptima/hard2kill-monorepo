"use client";

import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useEffect, useState } from "react";

let initialized = false;
let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"),
    );
  }

  if (!initialized) {
    setOptions({ key: apiKey, v: "weekly" });
    initialized = true;
  }

  loadPromise = Promise.all([
    importLibrary("maps"),
    importLibrary("streetView"),
    importLibrary("marker"),
  ]).then(() => undefined);

  return loadPromise;
}

export function useGoogleMaps(): {
  ready: boolean;
  error: Error | null;
} {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(
      () => {
        if (!cancelled) setReady(true);
      },
      (err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
