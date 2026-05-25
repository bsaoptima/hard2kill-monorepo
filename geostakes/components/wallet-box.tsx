export function WalletBox({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) {
  return (
    <div
      className="flex items-center gap-3 bg-card border border-border px-4 py-2 rounded-xl min-w-[120px] hover:border-primary/40 transition-colors"
      style={{
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
      }}
    >
      <div className="w-[3px] h-7 rounded-full bg-primary" />
      <div className="flex flex-col items-start leading-none">
        <div className="text-[9px] text-muted-foreground uppercase tracking-[0.14em] font-mono mb-1">
          {label}
        </div>
        <div className="text-[17px] font-bold tabular-nums text-primary">
          {amount}
        </div>
      </div>
    </div>
  );
}
