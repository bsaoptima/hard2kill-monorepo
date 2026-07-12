export function WalletBox({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) {
  return (
    <div
      className="flex items-center gap-2 sm:gap-3 bg-[#191a1f] border border-[#26272e] h-[44px] px-3 sm:px-4 hover:border-[#8b8c95] transition-colors"
      style={{
        boxShadow: "0 4px 0 #000",
      }}
    >
      <span className="w-[7px] h-[7px] rounded-full bg-[#39ff6a] shadow-[0_0_8px_#39ff6a] flex-shrink-0" />
      <div className="flex flex-col items-start leading-none justify-center">
        <div
          className="text-[9px] uppercase tracking-[0.14em] mb-1"
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            color: "#8b8c95",
          }}
        >
          {label}
        </div>
        <div
          className="text-[17px] tabular-nums"
          style={{
            fontFamily: "var(--font-saira-condensed), sans-serif",
            fontStyle: "italic",
            fontWeight: 900,
            color: "#f4f5f2",
          }}
        >
          {amount}
        </div>
      </div>
    </div>
  );
}
