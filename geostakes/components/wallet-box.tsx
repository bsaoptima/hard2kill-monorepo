export function WalletBox({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) {
  return (
    <div className="bg-card px-4 py-2 rounded-sm min-w-[90px] text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-[0.08em] mb-0.5">
        {label}
      </div>
      <div className="text-base font-bold tabular-nums">{amount}</div>
    </div>
  );
}
