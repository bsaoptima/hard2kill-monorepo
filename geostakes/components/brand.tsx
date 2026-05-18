import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/"
      className="text-2xl sm:text-[28px] font-black uppercase tracking-[-0.02em] hover:opacity-90 transition-opacity"
    >
      Geo<span className="text-primary">S</span>takes
    </Link>
  );
}
