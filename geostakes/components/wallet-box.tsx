export function WalletBox({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) {
  return (
    <div
      className="flex items-center gap-2 sm:gap-3 bg-card border border-border px-2 sm:px-4 py-1.5 sm:py-2 min-w-[100px] sm:min-w-[120px] hover:border-primary/40 transition-colors"
      style={{
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
      }}
    >
      <div className="w-[2px] sm:w-[3px] h-6 sm:h-7 bg-primary" />
      <div className="flex flex-col items-start leading-none">
        <div className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-[0.14em] font-mono mb-0.5 sm:mb-1">
          {label}
        </div>
        <div className="text-[15px] sm:text-[17px] font-bold tabular-nums text-primary">
          {amount}
        </div>
      </div>
    </div>
  );
}
