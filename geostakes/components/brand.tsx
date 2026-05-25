import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/"
      className="text-3xl sm:text-[34px] uppercase tracking-[0.01em] leading-none text-foreground hover:opacity-90 transition-opacity"
      style={{
        fontFamily: "var(--font-anton), Anton, 'Space Grotesk', sans-serif",
        fontStyle: "italic",
        fontWeight: 400,
      }}
    >
      Geo<span className="text-primary">stakes</span>
    </Link>
  );
}
