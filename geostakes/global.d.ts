// Umami analytics
interface UmamiTracker {
  track: (event: string, data?: Record<string, string | number>) => void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

export {};
