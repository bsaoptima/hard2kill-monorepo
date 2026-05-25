"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGoogleMaps } from "@/lib/use-google-maps";

type Candidate = {
  lat: number;
  lng: number;
  panoId: string;
  copyright?: string;
  date?: string;
};

type Recent = {
  id: string;
  lat: number;
  lng: number;
  label: string | null;
  difficulty: number;
  created_at: string;
};

const SELECTION_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: "greedy",
  minZoom: 2,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: false,
  draggableCursor: "crosshair",
};

const STREETVIEW_OPTIONS: google.maps.StreetViewPanoramaOptions = {
  addressControl: false,
  panControl: true,
  motionTracking: false,
  motionTrackingControl: false,
  enableCloseButton: false,
  zoomControl: true,
  fullscreenControl: false,
  showRoadLabels: false,
  clickToGo: false,
  scrollwheel: true,
  linksControl: false,
};

export function LocationValidator() {
  const { ready, error: mapsError } = useGoogleMaps();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const panoContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const svServiceRef = useRef<google.maps.StreetViewService | null>(null);

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [checking, setChecking] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [saving, setSaving] = useState(false);

  const [total, setTotal] = useState<number | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [sessionAdded, setSessionAdded] = useState(0);

  // Initialize map + street view once Google Maps is ready
  useEffect(() => {
    if (!ready || !mapContainerRef.current || !panoContainerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new google.maps.Map(mapContainerRef.current, {
      ...SELECTION_MAP_OPTIONS,
      center: { lat: 20, lng: 0 },
      zoom: 2,
    });

    panoramaRef.current = new google.maps.StreetViewPanorama(
      panoContainerRef.current,
      STREETVIEW_OPTIONS,
    );

    svServiceRef.current = new google.maps.StreetViewService();

    mapRef.current.addListener("click", async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      void selectLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
  }, [ready]);

  // Fetch initial recent additions + total count
  useEffect(() => {
    void refreshRecent();
  }, []);

  async function refreshRecent() {
    try {
      const res = await fetch("/api/admin/locations?limit=10", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = await res.json();
      setRecent(body.recent ?? []);
      setTotal(body.totalActive ?? 0);
    } catch (err) {
      console.error(err);
    }
  }

  async function selectLocation(loc: { lat: number; lng: number }) {
    if (!svServiceRef.current || !panoramaRef.current || !mapRef.current) return;
    setChecking(true);
    setCoverageError(null);
    setCandidate(null);

    // Drop marker on map
    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = new google.maps.Marker({
      position: loc,
      map: mapRef.current,
      animation: google.maps.Animation.DROP,
    });

    try {
      const result = await svServiceRef.current.getPanorama({
        location: loc,
        radius: 200,
        source: google.maps.StreetViewSource.OUTDOOR,
      });

      const data = result.data;
      if (!data || !data.location?.latLng || !data.location.pano) {
        setCoverageError("No outdoor Street View coverage within 200m");
        setChecking(false);
        return;
      }

      const snappedLat = data.location.latLng.lat();
      const snappedLng = data.location.latLng.lng();
      const panoId = data.location.pano;

      // Update marker to snapped position
      markerRef.current.setPosition({ lat: snappedLat, lng: snappedLng });

      panoramaRef.current.setPano(panoId);
      panoramaRef.current.setPov({ heading: 0, pitch: 0 });
      panoramaRef.current.setZoom(0);
      panoramaRef.current.setVisible(true);

      setCandidate({
        lat: snappedLat,
        lng: snappedLng,
        panoId,
        copyright: data.copyright,
        date: data.imageDate,
      });
      setLabel("");
      setDifficulty(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setCoverageError(
        msg.includes("ZERO_RESULTS")
          ? "No Street View imagery here"
          : `Lookup failed: ${msg}`,
      );
    } finally {
      setChecking(false);
    }
  }

  async function saveCandidate() {
    if (!candidate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: candidate.lat,
          lng: candidate.lng,
          panoId: candidate.panoId,
          label: label || undefined,
          difficulty,
          heading: panoramaRef.current?.getPov().heading ?? 0,
          pitch: panoramaRef.current?.getPov().pitch ?? 0,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Save failed");
        return;
      }
      if (body.duplicate) {
        toast.info("Already in pool (skipped)");
      } else {
        toast.success(`Added · ${body.totalActive} total`);
        setSessionAdded((n) => n + 1);
        setTotal(body.totalActive);
      }
      // Clear and refresh
      setCandidate(null);
      setLabel("");
      if (markerRef.current) markerRef.current.setMap(null);
      void refreshRecent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  function skipCandidate() {
    setCandidate(null);
    setLabel("");
    setCoverageError(null);
    if (markerRef.current) markerRef.current.setMap(null);
  }

  if (mapsError) {
    return (
      <div className="p-8 text-center">
        <div className="text-destructive font-bold mb-2">
          Google Maps failed to load
        </div>
        <div className="text-sm text-muted-foreground">{mapsError.message}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-70px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground font-mono">
            Admin · Location validator
          </div>
          <div className="text-sm text-foreground mt-0.5">
            Click anywhere on the map to preview Street View. Approve to add.
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              This session
            </div>
            <div className="text-xl font-bold tabular-nums text-primary">
              +{sessionAdded}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Pool total
            </div>
            <div className="text-xl font-bold tabular-nums">
              {total ?? "…"}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-pane area */}
      <div className="flex flex-1 min-h-0">
        {/* Map pane */}
        <div className="flex-1 relative border-r border-border">
          <div ref={mapContainerRef} className="absolute inset-0" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="text-sm text-muted-foreground">Loading map…</div>
            </div>
          )}
        </div>

        {/* Street View + form pane */}
        <div className="w-[560px] flex flex-col bg-card">
          <div className="relative flex-1 min-h-0">
            <div ref={panoContainerRef} className="absolute inset-0" />
            {!candidate && !checking && !coverageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 pointer-events-none">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">
                    Click on the map to preview
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Street View loads here
                  </div>
                </div>
              </div>
            )}
            {checking && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90">
                <div className="text-sm text-muted-foreground">
                  Checking coverage…
                </div>
              </div>
            )}
            {coverageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90">
                <div className="text-center p-6">
                  <div className="text-destructive font-bold mb-2">
                    No Street View
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {coverageError}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">
                    Try another spot on the map.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          {candidate && (
            <div className="border-t border-border p-4 space-y-3">
              <div className="text-[10px] text-muted-foreground font-mono">
                {candidate.lat.toFixed(5)}, {candidate.lng.toFixed(5)}
                {candidate.date && ` · ${candidate.date}`}
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Paris — Eiffel Tower"
                  className="w-full bg-background border border-border px-3 py-2 text-sm rounded-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
                  Difficulty: {difficulty} / 5
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
                  <span>Iconic</span>
                  <span>Hard</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={skipCandidate}
                  className="flex-1 bg-transparent border border-border text-foreground py-2.5 rounded-sm text-sm hover:border-muted-foreground transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={saveCandidate}
                  disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-sm text-sm font-bold uppercase tracking-[0.04em] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add to pool"}
                </button>
              </div>
            </div>
          )}

          {/* Recent additions */}
          <div className="border-t border-border p-4 max-h-[200px] overflow-y-auto">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">
              Recent additions
            </div>
            {recent.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                Nothing added yet.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {recent.map((r) => (
                  <li
                    key={r.id}
                    className="text-xs flex items-center gap-2 font-mono"
                  >
                    <span className="text-muted-foreground tabular-nums">
                      d{r.difficulty}
                    </span>
                    <span className="text-foreground truncate flex-1">
                      {r.label || `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
