import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.GEOSTAKES_FROM_EMAIL ?? "Geostakes <noreply@geostakes.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://geostakes.com";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Fire-and-forget email send. Never throws — failures are logged and
 * swallowed so they can't break the seed-resolution flow.
 */
async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping email to", opts.to);
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error("[email] Resend error", { to: opts.to, error });
    }
  } catch (err) {
    console.error("[email] send failed", { to: opts.to, err });
  }
}

export type SeedResolveOutcome = "won" | "lost" | "tied";

/**
 * Send a seed-resolution email to a single player.
 */
export async function sendSeedResolveEmail(opts: {
  to: string;
  outcome: SeedResolveOutcome;
  yourScore: number;
  opponentScore: number;
  betAmount: number;
  payout: number;
  seedId: string;
  playId: string;
}): Promise<void> {
  const { to, outcome, yourScore, opponentScore, betAmount, payout, seedId, playId } = opts;

  let subject: string;
  let headline: string;
  let body: string;

  const playUrl = `${APP_URL}/play/${playId}`;

  if (outcome === "won") {
    subject = `🏆 You won $${payout.toFixed(2)} on Geostakes`;
    headline = `You won $${payout.toFixed(2)}`;
    body = `Your $${betAmount} ghost match resolved — you beat your opponent ${yourScore.toLocaleString()} to ${opponentScore.toLocaleString()}. Your winnings are in your balance.`;
  } else if (outcome === "lost") {
    subject = `Your Geostakes match resolved`;
    headline = `Tough one — your opponent edged you out`;
    body = `Your $${betAmount} ghost match resolved. Opponent scored ${opponentScore.toLocaleString()}, you scored ${yourScore.toLocaleString()}. Rematch?`;
  } else {
    subject = `Tie on Geostakes — your stake was refunded`;
    headline = `Dead heat — $${betAmount} refunded`;
    body = `Your $${betAmount} ghost match ended in a tie. Both players scored ${yourScore.toLocaleString()}. Your stake is back in your balance.`;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#07080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f4f6f8;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#07080a;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#13161a;border:1px solid #1f2329;border-radius:8px;overflow:hidden;">
  <tr>
    <td style="padding:32px 32px 8px 32px;">
      <div style="font-family:'Anton',sans-serif;font-style:italic;font-size:28px;letter-spacing:0.02em;color:#f4f6f8;text-transform:uppercase;">
        Geo<span style="color:#7fff64;">stakes</span>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 32px 8px 32px;">
      <h1 style="margin:0;font-size:24px;font-weight:600;color:#f4f6f8;line-height:1.2;">${headline}</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 32px 24px 32px;">
      <p style="margin:0;font-size:15px;line-height:1.5;color:#aab2bd;">${body}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 32px 32px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f1114;border:1px solid #1f2329;">
        <tr>
          <td style="padding:14px 18px;border-right:1px solid #1f2329;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#707782;margin-bottom:4px;">Your score</div>
            <div style="font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;color:${outcome === "won" ? "#7fff64" : "#f4f6f8"};">${yourScore.toLocaleString()}</div>
          </td>
          <td style="padding:14px 18px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#707782;margin-bottom:4px;">Opponent</div>
            <div style="font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;color:${outcome === "lost" ? "#ff8866" : "#f4f6f8"};">${opponentScore.toLocaleString()}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 32px 32px;" align="center">
      <a href="${playUrl}" style="display:inline-block;background:#7fff64;color:#06120a;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;">View match details</a>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 32px;border-top:1px solid #1f2329;background:#0f1114;">
      <p style="margin:0;font-size:11px;color:#707782;font-family:monospace;">
        Geostakes · Play responsibly · 18+ where legal · Seed ${seedId.slice(0, 8)}
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>
  `.trim();

  await sendEmail({ to, subject, html });
}

/**
 * Admin alert when a creator finishes their seed — the moment it becomes
 * matchable. Used by Stefan to manually seed liquidity by jumping in as
 * the challenger.
 */
export async function sendAdminSeedAlert(opts: {
  creatorEmail: string;
  creatorScore: number;
  betAmount: number;
  seedId: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) {
    console.warn("[email] ADMIN_NOTIFY_EMAIL not set, skipping admin alert");
    return;
  }

  const { creatorEmail, creatorScore, betAmount, seedId } = opts;
  const playUrl = `${APP_URL}/?tier=${betAmount}`;

  const subject = `🎯 New $${betAmount} seed open — score ${creatorScore.toLocaleString()}`;

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#07080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f4f6f8;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#07080a;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#13161a;border:1px solid #1f2329;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:24px 32px 8px 32px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#7fff64;font-family:monospace;">Admin alert · liquidity</div>
    <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:600;color:#f4f6f8;">New seed waiting for a challenger</h1>
  </td></tr>
  <tr><td style="padding:16px 32px 0 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f1114;border:1px solid #1f2329;">
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #1f2329;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#707782;font-family:monospace;">Player</div>
          <div style="font-size:15px;color:#f4f6f8;margin-top:4px;font-family:monospace;">${creatorEmail}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #1f2329;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width:50%;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#707782;font-family:monospace;">Stake</div>
                <div style="font-size:22px;font-weight:600;color:#7fff64;margin-top:4px;font-variant-numeric:tabular-nums;">$${betAmount}</div>
              </td>
              <td style="width:50%;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#707782;font-family:monospace;">Score to beat</div>
                <div style="font-size:22px;font-weight:600;color:#f4f6f8;margin-top:4px;font-variant-numeric:tabular-nums;">${creatorScore.toLocaleString()}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 18px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#707782;font-family:monospace;">Seed ID</div>
          <div style="font-size:11px;color:#aab2bd;margin-top:4px;font-family:monospace;">${seedId}</div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 32px 8px 32px;">
    <p style="margin:0;font-size:14px;line-height:1.5;color:#aab2bd;">
      Hit Play at the <b style="color:#f4f6f8;">$${betAmount}</b> tier from any logged-in account
      to join as challenger. With score-band disabled, you'll be matched into the oldest
      open seed at that tier — likely this one if it's fresh.
    </p>
  </td></tr>
  <tr><td style="padding:8px 32px 32px 32px;" align="center">
    <a href="${playUrl}" style="display:inline-block;background:#7fff64;color:#06120a;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;">Play $${betAmount} now</a>
  </td></tr>
  <tr><td style="padding:18px 32px;border-top:1px solid #1f2329;background:#0f1114;">
    <p style="margin:0;font-size:11px;color:#707782;font-family:monospace;">
      Admin notification · only sent to ADMIN_NOTIFY_EMAIL
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>
  `.trim();

  await sendEmail({ to: adminEmail, subject, html });
}

type WithdrawalDestinationSummary = {
  label: string; // e.g. "PIX", "USDC (Base)", "Bank (IBAN)"
  primary: string; // headline destination value, masked for user email
  detailRows: { label: string; value: string }[]; // additional rows for admin
  eta: string; // expected processing time, used in copy
};

function summarizeDestination(d: {
  type: "pix" | "crypto_usdc_base" | "bank";
  key?: string;
  address?: string;
  holderName?: string;
  iban?: string;
  bankName?: string;
  swift?: string;
  country?: string;
}): WithdrawalDestinationSummary {
  const mask = (s: string) =>
    s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;

  if (d.type === "pix") {
    return {
      label: "PIX",
      primary: mask(d.key ?? ""),
      detailRows: [{ label: "PIX KEY", value: d.key ?? "" }],
      eta: "under 24 hours",
    };
  }
  if (d.type === "crypto_usdc_base") {
    return {
      label: "USDC (Base)",
      primary: mask(d.address ?? ""),
      detailRows: [
        { label: "USDC BASE ADDRESS", value: d.address ?? "" },
        { label: "NETWORK", value: "Base (Coinbase L2)" },
      ],
      eta: "under 24 hours",
    };
  }
  // bank
  return {
    label: "Bank (IBAN)",
    primary: mask(d.iban ?? ""),
    detailRows: [
      { label: "ACCOUNT HOLDER", value: d.holderName ?? "" },
      { label: "IBAN", value: d.iban ?? "" },
      { label: "BANK NAME", value: d.bankName ?? "" },
      ...(d.swift ? [{ label: "SWIFT / BIC", value: d.swift }] : []),
      ...(d.country ? [{ label: "COUNTRY", value: d.country }] : []),
    ],
    eta: "1-3 business days",
  };
}

/**
 * User-facing receipt when a withdrawal request is created.
 */
export async function sendWithdrawalRequestReceipt(opts: {
  to: string;
  amount: number;
  destination: {
    type: "pix" | "crypto_usdc_base" | "bank";
    key?: string;
    address?: string;
    holderName?: string;
    iban?: string;
    bankName?: string;
    swift?: string;
    country?: string;
  };
  withdrawalId: string;
}): Promise<void> {
  const { to, amount, destination, withdrawalId } = opts;
  const summary = summarizeDestination(destination);
  const destLabel = summary.label;
  const masked = summary.primary;

  const subject = `Withdrawal request received — $${amount.toFixed(2)}`;
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#07080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f4f6f8;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#07080a;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#13161a;border:1px solid #1f2329;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:32px 32px 8px 32px;">
    <div style="font-family:'Anton',sans-serif;font-style:italic;font-size:28px;letter-spacing:0.02em;color:#f4f6f8;text-transform:uppercase;">
      Geo<span style="color:#7fff64;">stakes</span>
    </div>
  </td></tr>
  <tr><td style="padding:24px 32px 8px 32px;">
    <h1 style="margin:0;font-size:22px;font-weight:600;color:#f4f6f8;line-height:1.2;">Withdrawal request received</h1>
    <p style="margin:8px 0 0 0;font-size:14px;color:#aab2bd;line-height:1.5;">
      Your <b style="color:#7fff64;">$${amount.toFixed(2)}</b> withdrawal to ${destLabel} <code style="font-family:monospace;color:#f4f6f8;">${masked}</code> is being processed. You'll get another email once it's sent — typically ${summary.eta}.
    </p>
  </td></tr>
  <tr><td style="padding:18px 32px;border-top:1px solid #1f2329;background:#0f1114;">
    <p style="margin:0;font-size:11px;color:#707782;font-family:monospace;">
      Geostakes · Reference ${withdrawalId.slice(0, 8)}
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>
  `.trim();

  await sendEmail({ to, subject, html });
}

/**
 * Admin alert when a withdrawal request is created — so Stefan can act on it.
 */
export async function sendWithdrawalAdminAlert(opts: {
  userEmail: string;
  amount: number;
  destination: {
    type: "pix" | "crypto_usdc_base" | "bank";
    key?: string;
    address?: string;
    holderName?: string;
    iban?: string;
    bankName?: string;
    swift?: string;
    country?: string;
  };
  withdrawalId: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) {
    console.warn("[email] ADMIN_NOTIFY_EMAIL not set, skipping withdrawal admin alert");
    return;
  }
  const { userEmail, amount, destination, withdrawalId } = opts;
  const summary = summarizeDestination(destination);
  const detailRowsHtml = summary.detailRows
    .map(
      (r) => `
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #1f2329;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#707782;font-family:monospace;">${r.label}</div>
          <div style="font-size:13px;color:#f4f6f8;margin-top:4px;font-family:monospace;word-break:break-all;">${r.value}</div>
        </td>
      </tr>`,
    )
    .join("");

  const subject = `💸 Withdrawal request: $${amount.toFixed(2)} via ${summary.label}`;
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#07080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f4f6f8;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#07080a;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#13161a;border:1px solid #1f2329;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:24px 32px 8px 32px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#ffb866;font-family:monospace;">Admin alert · withdrawal</div>
    <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:600;color:#f4f6f8;">Process payout</h1>
  </td></tr>
  <tr><td style="padding:16px 32px 0 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f1114;border:1px solid #1f2329;">
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #1f2329;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#707782;font-family:monospace;">From user</div>
          <div style="font-size:14px;color:#f4f6f8;margin-top:4px;font-family:monospace;">${userEmail}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #1f2329;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#707782;font-family:monospace;">Amount</div>
          <div style="font-size:26px;font-weight:600;color:#7fff64;margin-top:4px;font-variant-numeric:tabular-nums;">$${amount.toFixed(2)}</div>
        </td>
      </tr>
      ${detailRowsHtml}
    </table>
  </td></tr>
  <tr><td style="padding:24px 32px 12px 32px;">
    <p style="margin:0;font-size:13px;line-height:1.55;color:#aab2bd;">
      Balance already debited. Send the payment manually via Wise / Brazilian bank / Base wallet, then mark the withdrawal as <b style="color:#f4f6f8;">completed</b> in Supabase (or via the admin endpoint).
    </p>
  </td></tr>
  <tr><td style="padding:18px 32px;border-top:1px solid #1f2329;background:#0f1114;">
    <p style="margin:0;font-size:11px;color:#707782;font-family:monospace;">
      Reference ${withdrawalId}
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>
  `.trim();

  await sendEmail({ to: adminEmail, subject, html });
}
