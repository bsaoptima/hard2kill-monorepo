# Competitor Deep Dive: Triumph Arcade

> Last updated: April 27, 2026

---

## Company Overview

**What they are:** A skill-based real-money mobile gaming platform. Players download an iOS/Android app, deposit cash, and compete in casual arcade-style games (Solitaire, Bingo, Blackjack, Pool, Brick Breaker, Doodle Jump-likes, peg games, etc.) for cash prizes. Outcomes determined by skill, no chance. Triumph also operates a B2B SDK that lets third-party game developers add real-money tournaments to their own games — the dual model of own-app + SDK is unusual.

**Founded:** 2021 in San Francisco. Started during COVID lockdowns.

**Founders:**
- **Jacob (Jake) Brooks** — Co-CEO. Stanford CS. Dropped out to build Triumph.
- **Jared Geller** — Co-CEO. Stanford CS. Graduated.

**Origin story:** Brooks and Geller created an "isolation pod" during COVID, played mobile games with friends and Venmo'd each other small wagers on outcomes. Concluded the wagering layer should be built directly into games. Spun it out as a company.

**Headquarters:** San Francisco, CA

**Employees:** ~7 (as of July 2024 per Tracxn) — extremely lean for the funding raised. Implies a heavy bet on platform leverage rather than headcount.

**Legal entity:** Triumph Labs (LLC). Operates as "Triumph" / "Triumph Arcade" consumer-facing.

**Website:** triumpharcade.com (consumer app), docs.triumpharcade.com (legal/SDK docs)

---

## Funding & Valuation

| Date | Round | Amount | Lead | Notable Investors |
|------|-------|--------|------|-------------------|
| Apr 21, 2022 | Seed | $3.9M | Flux | BoxGroup, Heroic Ventures, Kevin Hartz |
| May 10, 2023 | Series A | ~$10.2M | General Catalyst | Box Group, Heroic, Nostalgic Modern, Raven One, Steel Perlot, Strike, Valhalla, Great Oaks, Magic Fund |
| (later round) | undisclosed | balance to $26.2M | — | brings cumulative to ~$26.2M per Tracxn |

**Total raised:** $26.2M across 3 rounds (Tracxn, 2026). 16 investors total.

**Valuation:** Not public. Series A typical multiples for a sub-$1M-revenue gaming SDK in 2023 = ~$50-100M post-money. Likely sub-$200M today given headcount and traction.

**Tracxn ranking:** 21st of 364 in skill-gaming space, 4th by total funding in category.

---

## How It Works

### The B2C App (Triumph Arcade)

```
User downloads Triumph app (iOS / Android)
         |
GPS verifies they're in an allowed state (39 supported, 19 blocked)
         |
Deposits cash (debit, ACH)
         |
Picks a game + format (1v1 Duel, Arena, Group Battle, or Blitz)
         |
Pays entry fee → enters tournament
         |
Plays the game (async, score-based)
         |
Triumph's server scores the run → ranks against opponents who played the same game
         |
Winner credited to balance, instant cash-out via Venmo/PayPal/Debit/ACH
```

### The Match Formats

| Format | Players | Style | Notes |
|--------|---------|-------|-------|
| **Blitz** | 1 (single player) | Score chase | Beat a target score for fixed payout. The simplest format. |
| **1v1 Duel** | 2 | Async head-to-head | Both play the same game, higher score wins |
| **Arena** | Many (live multiplayer) | Real-time multiplayer score battle | Closer to live PvP, but the gameplay isn't direct interaction — players' performances are compared in real-time |
| **Group Battle** | 6 | Tournament bracket | Larger pots, longer commitment |

**Critical detail:** Triumph is mostly **async**, just like Skillz. You're not playing *against* an opponent — you're playing the game, and your score is compared to theirs. Even "Live Multiplayer / Arena" mode is performance-comparison rather than interactive PvP. This is the core architectural choice.

### Rake / Fee Structure

**Triumph takes 20% of tournament fees.** From their FAQ:
- In Blitz Mode (single-player): the entry fee is the platform's cut directly
- In 1v1 Tournaments: the fee is `(entry × 2 − total prize) / 2`. Example: $0.60 entry, $1.00 prize = $0.10 fee per player ≈ 17% effective rake
- Stated platform-wide: 20% of tournament fees

**Compare:** Hard2Kill's planned 10% rake is half of Triumph's. Players' Lounge: 10%. Skillz: variable but historically higher. Poker rooms: 2.5-10% capped. Triumph's 20% is on the high end and only works because their entry fees are tiny ($0.10-$5 typical) — players don't compute the percentage when the absolute number is small.

### Anti-Cheat & Compliance Stack

- **GPS geolocation** verifies allowed state on every match
- **VPN blocking** to stop users circumventing geo
- **Device monitoring** for jailbreak / cheat-tool detection
- **Elo rating** for matchmaking and skill verification
- **Free practice mode** before paid play
- KYC handled via debit/ACH banking rails (no separate identity verification disclosed)

### Cash Out

Instant withdrawal to Venmo, PayPal, Debit, or ACH. No fee disclosed. No minimum disclosed in public docs (vs. Players' Lounge $10 minimum + $5 fee). This is genuinely faster and friendlier than most competitors — meaningful trust differentiator.

---

## Game Library

Confirmed titles (App Store description, April 2026):

| Game | Genre | Notes |
|------|-------|-------|
| Solitaire | Cards | Skillz's flagship category — Triumph went straight at it |
| Bingo | Cards/Numbers | Same |
| Blackjack | Cards | Skill version (no random shoe — replayable hand decisions) |
| Pool | Sports | Casual billiards |
| Brick Breaker | Arcade | Breakout-style |
| Doodle Jump (likely re-skin) | Arcade | Vertical climber |
| Block Party | Puzzle | Tetris-like |
| Chicken Run | Arcade | Original IP |
| Chaos Cannon | Arcade | Original IP |
| Ball Bounce | Arcade | Original IP |
| Peg Master / Super Peg Master | Puzzle | Peggle-likes |
| Rips | Card/word | Original IP, has its own ToS page |

Total claim: **18+ games**, all skill-based, no ads. Several look like Skillz-era classics rebuilt under Triumph's roof.

### The B2B SDK

- One-line drop-in SDK for iOS games
- Triumph handles: matchmaking, payments, arbitration, compliance, geo-fencing, Elo
- Publisher gets: tournament infra without building any of it
- Marketed traction claims: **3.6x more sessions per month** for players who play real-prize games, **$54 ARPU** for paid mode players
- Comparable to Skillz SDK at a smaller scale, but built modern

**Is the SDK actually getting traction?** Hard to tell publicly. Their own app is clearly the volume driver — the SDK exists but third-party games shipping with Triumph integration aren't prominent. Likely a "we'll license it if you ask" play more than an active sales motion at 7 employees.

---

## Traction

| Metric | Value | Source |
|--------|-------|--------|
| **App Store rating** | 4.7 / 5 | iOS App Store, April 2026 |
| **App Store review count** | 902,000 | Same |
| **Total payouts (1 year)** | $100M+ | Their own marketing claim, App Store |
| **States supported** | 39 + DC | Their FAQ |
| **States blocked** | 19 + Puerto Rico | Their FAQ |
| **App size** | 2 GB | App Store |
| **Cumulative session ARPU (paid)** | $54/month | Their pitch deck via TechCrunch |
| **Engagement uplift (real money vs free)** | 3.6× sessions | Same |

**902K App Store reviews at 4.7/5 is the headline number.** That's massive social proof. For comparison: Players' Lounge has ~hundreds of Trustpilot reviews at 1.5/5. DamnBruh has 64 Trustpilot reviews at 2.9/5. Triumph cleared a credibility bar Players' Lounge never managed.

**$100M paid out in a year:** Implies $20M+ in rake revenue at 20% take rate, which makes them roughly 2-3× Players' Lounge's annual revenue (~$7.8M) at one-tenth the headcount.

---

## User Acquisition Playbook

Per Snapchat's published case study (forbusiness.snapchat.com):

- **Channel:** Snapchat Ads, heavy. Bottom-funnel conversion-focused.
- **Creative:** Celebrity rappers playing Triumph games in casual settings, livestreams, direct-to-camera. "Culturally relevant creative."
- **Tactics:** Snap Ads, Tile-less Story Ads, Sponsored Snaps, App End Cards, Playables.
- **Tools:** Advanced Conversions (post-ATT measurement workaround), Target Cost bidding, App Power Pack.
- **Stated results:** 2.6× installs, −37% CPI, +94% purchases at −15% cost per purchase in two months.

**The takeaway:** Triumph's UA is paid mobile-first, exactly the model Skillz used and Apple's ATT broke. They appear to have engineered around ATT via Snapchat's "Advanced Conversions" privacy-compliant attribution, but they're still structurally exposed if Apple tightens the screws further. They are NOT organic, NOT community-led, NOT influencer-affiliate. This is the opposite end of the playbook spectrum from Hard2Kill's Discord/TikTok organic strategy.

---

## Restricted States (19 + PR)

Arizona, Arkansas, Colorado, Connecticut, Delaware, Florida, Kentucky, Louisiana, Maine, Maryland, Mississippi, Montana, Nebraska, New Hampshire, New Mexico, South Carolina, Tennessee, Puerto Rico, Washington.

**Compare to Players' Lounge** (14 states): AZ, AR, CT, DE, FL, IN, LA, MD, MN, MT, SC, SD, TN, WY.

Different list. Triumph's is *more restrictive* (19 vs 14), suggesting they got more aggressive legal review and decided to block borderline jurisdictions. This is informative for H2K — multiple operators reading the same laws are coming up with overlapping but different restricted lists, which means there's no single canonical "skill-gaming legal" map. **Get a lawyer** is the lesson.

---

## Legal Positioning

Per their FAQ, Triumph leans on two tests:

1. **Dominant Factor Test** — skill must be the primary driver of outcomes (most US states use this)
2. **Material Element Test** — chance cannot play a "significant role" even if skill dominates (stricter, used by some jurisdictions)

They argue that with chance removed, the gambling trifecta (prize + paid entry + chance) is broken, exempting them from UIGEA. Same legal architecture as Skillz, Players' Lounge, Hard2Kill. Standard skill-gaming playbook.

---

## Strengths

1. **App Store reputation moat.** 902K reviews at 4.7/5 is genuinely hard to fake or replicate. Trust is a moat in money gaming, and Triumph has it. Players' Lounge (1.5/5) and DamnBruh (2.9/5) lost on this dimension; Triumph won.
2. **Instant cash-out via Venmo/PayPal/Debit/ACH.** No $5 fee, no $10 minimum, no 5-day hold (Players' Lounge). This is a real product win and probably drives the rating gap.
3. **20% rake on tiny entry fees that players don't notice.** $0.10 fee on a $1 game feels free. The 20% rate would be unacceptable on a $50 wager but works at micro-stakes.
4. **Lean team (7 people) supporting $20M+ revenue.** Insane operating leverage. Either they're severely understaffed or the SDK + automation infrastructure they've built is genuinely effortful per dollar.
5. **Casual game library hits Skillz's exact demographic.** Solitaire / Bingo / Blackjack pull the 30-55 female casual gamer that no other PvP wager platform reaches. They're the natural successor to Skillz at peak.
6. **B2B SDK as optionality.** If the consumer app plateaus, the SDK becomes the moat — license it to existing mobile games at scale.
7. **Capital efficiency with strong investor signal.** General Catalyst Series A, Box Group seed, Kevin Hartz angel — these are the funds that bet on real outcomes. Suggests serious VC believes the model works.
8. **Modern engineering.** Server-determined scoring, anti-cheat infrastructure, Elo, GPS, VPN blocking — all built in 2021-2024 with current best practices. Not a legacy stack like Skillz.
9. **39-state coverage.** Larger US footprint than Players' Lounge (36+).

---

## Weaknesses

1. **iOS-first → ATT exposure.** Same Skillz vulnerability. They've engineered around it with Snapchat Advanced Conversions, but Apple can tighten further. Their distribution is Apple-controlled.
2. **Async, not real-time PvP.** "Arena" mode is real-time score comparison, not interactive head-to-head. The adrenaline ceiling is fundamentally lower than a real PvP shooter or fighting game. Same engagement weakness as Skillz.
3. **Casual demographic = lower stakes ceiling.** Solitaire players don't wager $50/match. Triumph's model only works at micro-stakes ($0.10-$5 entry) — they can't do high-roller economics.
4. **Heavy paid-UA dependency.** Snapchat ad spend is the engine. If creative fatigue hits or Snapchat tightens or Apple breaks attribution again, they're in Skillz's 2021 position.
5. **20% rake is high.** Sustainable now because players don't notice it on $1 entries, but it caps their pricing power and any move to higher stakes will face rake-shock.
6. **App Store dependency.** No web fallback. If Apple ever reclassifies them as gambling (like Google Play does), the entire business is gone.
7. **No social / viral / community layer.** No Discord, no streamer integration, no challenge links, no shareable wins. Their growth is paid ads + in-app retention. The viral surface area is zero.
8. **Single-platform game library.** All custom-built or licensed casual games — no AAA titles, no shooters, no FPS, no fighters. They will never reach the competitive-gamer demographic that drives the highest LTVs.
9. **Lean team = key-person risk.** 7 people. If 1-2 leave, half the institutional knowledge walks out. They're betting on automation holding up.
10. **Real ARPU is unverified.** $54/month is a pitch deck number. The 902K reviews + $100M payouts checks out, but per-user economics could be far below what they claim once you back out promo spend, refunds, and deposit-bonus burn.

---

## Hard2Kill vs. Triumph Arcade

### Where Hard2Kill Is Stronger

| Advantage | Why It Matters |
|-----------|---------------|
| **Real-time PvP, server-authoritative** | Triumph is async score comparison even in "Arena" mode. You're not really playing against the opponent — you're racing their performance. Hard2Kill is live, in-the-same-server, "I just shot you" PvP. The emotional intensity is structurally higher. |
| **Web-first, no app store dependency** | Triumph is iOS/Android-locked. Apple ATT broke Skillz with the same posture. Triumph has Apple as a single point of failure; H2K's Discord/TikTok/Kick distribution is outside any platform's control. |
| **Higher stakes possible** | Triumph's 20% rake + casual game library caps wagers around $5. H2K can offer $25, $50, $100 PvP wagers because the gameplay justifies the stakes (poker analogy: you don't bet $100 on Solitaire, but you do on heads-up Hold'em). |
| **Competitive gamer demographic** | Triumph serves casual mobile (Solitaire/Bingo). H2K serves shooter players who already wager money in Discord with manual middlemen. Different audience, higher ego/conviction-driven LTV. |
| **Community / viral mechanics** | H2K has Discord-native distribution, challenge links, streamer integration, shareable wins. Triumph has none — they buy installs via Snapchat ads, full stop. |
| **Lower rake (10% planned)** | Half of Triumph's 20%. At higher stakes, the difference is decisive — a $50 wager nets you $90 on H2K vs $80 on Triumph. |
| **Owns the games end-to-end** | Triumph's games are simple iOS apps with their SDK glued on. H2K's games are server-authoritative custom builds with the wagering integrated at the engine level. Stronger anti-cheat posture. |

### Where Triumph Is Stronger

| Advantage | Why It Matters |
|-----------|---------------|
| **Capital and runway** | $26.2M raised vs H2K's $5K bootstrapped budget. Triumph can outspend, out-hire, and out-survive any direct competition for years. |
| **App Store reputation** | 902K reviews at 4.7/5. H2K has zero brand. Trust takes years to build in money gaming. |
| **Casual demographic reach** | They reach the 30-55 female solitaire-and-bingo audience. H2K's FPS games will never touch this demographic. They have a market H2K cannot serve. |
| **Established legal/compliance infra** | 39-state geo-fencing, KYC, GPS, VPN blocking — all live in production for years. H2K has Stripe and a TODO list. |
| **Instant cash-out infrastructure** | Venmo / PayPal / Debit / ACH all live and tested at scale. H2K has Stripe deposits and no withdrawal flow yet. |
| **VC backing as social proof** | General Catalyst + Box Group + Kevin Hartz signals "this is a real company." Investors and partners take meetings. |
| **Async = no cold-start problem** | Triumph never needs concurrent players. H2K must fill lobbies (mitigated by 5s bot fill, but still a structural gap). |
| **B2B SDK optionality** | They have a second business model in the building. H2K does not. |
| **Anti-cheat track record** | Years of VPN/geo/Elo enforcement under real adversarial pressure. H2K is untested at scale. |

### Strategic Comparison

| Dimension | Triumph Arcade | Hard2Kill |
|-----------|---------------|-----------|
| **Model** | iOS/Android casual skill games + B2B SDK | Web-based real-time PvP wagering on owned shooter games |
| **Revenue (est)** | ~$20M+ ARR (back-of-envelope from $100M payouts × 20% rake) | $0 |
| **Funding** | $26.2M raised | Bootstrapped, $5K active budget |
| **Team** | 7 people | 1 person (Stefan) |
| **Games** | 18+ casual (Solitaire, Bingo, Blackjack, Pool, etc.) | 2 custom (GladiatorZ, Wasteland) → pivoting to CS 1.6 |
| **Match style** | Async score comparison + "live multiplayer" arenas | Real-time server-authoritative PvP |
| **Distribution** | iOS App Store + Google Play | Web (Discord, TikTok, Kick) |
| **UA channel** | Snapchat Ads + celebrity creative | Discord wager servers + TikTok organic + streamer affiliates |
| **Demographic** | Casual mobile, broader gender mix, 25-55 | Competitive gamers, 18-30, ~90%+ male |
| **Stakes** | $0.10-$5 typical | $1-$10 today, designed for $25-$500 |
| **Rake** | 20% | 10% planned |
| **Cash-out** | Instant Venmo/PayPal/Debit/ACH | Stripe (TBD) |
| **Trust signal** | 4.7/5 (902K reviews) | None yet |
| **Restricted states** | 19 + PR | TBD (will likely match PL's 14) |
| **Cold start** | Solved (async) | Mitigated (5s bot fill) |

---

## Key Lessons For Hard2Kill

### 1. Async + casual + paid UA can absolutely work — at scale

Triumph proves the Skillz model isn't dead. With better UX (instant payouts, modern app), tighter legal (39 states, VPN blocking, GPS), and a single capable UA channel (Snapchat post-ATT), you can build a $20M-revenue business with 7 people. The model isn't broken — Skillz's execution was. **This is a genuine threat-and-validation read for H2K**: the demand is real, but Triumph already serves the casual segment competently.

### 2. Don't compete on Triumph's ground

Solitaire, Bingo, Blackjack, casual peg games are owned by Triumph in the US. Building those means losing the trust war (no chance to beat 902K 4.7-star reviews) and the capital war ($5K vs $26M). **H2K's lane is the lane Triumph cannot enter:** real-time competitive PvP, FPS, shooter-style cash matches. Stay there.

### 3. App Store presence is a moat AND a vulnerability

Triumph's 902K reviews are insurmountable as a positive signal — but iOS is also their single largest dependency. Apple ATT broke Skillz at the same posture. **H2K's web-first stance is genuinely structural defense**, not just a tactical preference. Don't drift into "we should build a native app" without weighing the gatekeeping risk.

### 4. Instant cash-out via Venmo/PayPal/Debit is a real differentiator

Triumph beats Players' Lounge on this exact axis (1.5★ → 4.7★ partly because of withdrawal UX). Plan H2K's withdrawal flow to be Venmo-fast, not Stripe-bank-transfer-slow. Frictionless cash-out is half of trust.

### 5. 20% rake is a ceiling, not a floor

Triumph runs 20% rake at $0.10-$5 entries because nobody computes percentage at those amounts. **H2K's 10% rake is a competitive advantage at higher stakes** — at $50 wagers, players DO calculate, and a $5 vs $10 platform fee is decisive. Don't raise the rake just because Triumph does. The market segments by stake size.

### 6. Casual games unlock a demographic H2K can't reach today

Triumph proves Skillz's old finding: half of paying casual-game users are female, the 30-55 demographic spends well, and these are the highest-LTV cohorts in skill gaming. H2K's shooter library will never touch this audience. **If H2K ever adds non-shooter games (after the CS focus is locked in), casual skill games (1v1 pool, blitz chess, puzzle battles) are the way to expand the demographic — because Triumph's specific games and Triumph's specific platform aren't where these users would go for *real-time* play.** Real-time pool/chess is the unreached gap.

### 7. The B2B SDK play is interesting but slow

Triumph's SDK is real but quiet — 7 employees can't run an active B2B sales motion. The SDK is more "license available" than "actively closing." **For H2K, the parallel would be:** at some point, license H2K's wagering layer to Discord wager community games, third-party indies, or even AAA studios. But not now. Not at 0 DAU. SDK is a Year 3 move, not a Year 1 move.

### 8. Triumph is not gunning for H2K's audience — yet

Triumph hasn't built a single shooter, FPS, or PvP-style game. Their roadmap has been deeper casual genres (more cards, more puzzles) for years. The competitive overlap with H2K is currently zero, and likely stays low because their tech stack and UA playbook are mismatched to PvP gaming. **Don't waste cycles defending against Triumph; defend against DamnBruh, Players' Lounge, and the wager-Discord status quo.**

### 9. Their UA is the *opposite* of yours — and that's fine

Triumph: Snapchat ads + celebrity creative + bottom-funnel optimization. H2K: Discord infiltration + TikTok organic + streamer affiliates. Both can work in their respective demographics. Triumph's tactics don't transfer to H2K (rappers playing Solitaire ads won't convert FPS players), and H2K's tactics don't transfer to Triumph (Discord wager servers don't have Solitaire grandmas). **Two completely separate playbooks for two completely separate markets in the same legal category.**

### 10. The audacity of 7 employees doing $20M+

Whatever else is true, Triumph has built a tight operating loop. Heavy infrastructure + minimal headcount is the model that survives 2026's funding environment. **For H2K as a solo founder, the relevant takeaway is: automation, server-authoritative integrity, and a tight legal/compliance infrastructure compound over time.** The first hires should preserve this leverage, not break it.

---

## Sources

- [Triumph raises $14M for an SDK to add real-money tournaments into games — TechCrunch](https://techcrunch.com/2023/05/10/triumph-raises-14m-for-an-sdk-to-add-real-money-tournaments-into-games/)
- [Triumph Launches with $14.1M to Power Monetization for Game Developers — PRNewswire](https://www.prnewswire.com/news-releases/triumph-launches-with-14-1m-to-power-monetization-for-game-developers-301820158.html)
- [Triumph — Tracxn Company Profile (2026)](https://tracxn.com/d/companies/triumph/__xSZ55gTeccdfRzUlcLA3p4KruYjSJADTCrm2mbb1Ocg)
- [Triumph Arcade — Crunchbase](https://www.crunchbase.com/organization/triumph-934d)
- [Triumph: Play for Cash — App Store](https://apps.apple.com/us/app/triumph-play-for-cash/id1608987929)
- [Triumph Docs — Regulatory and Legal FAQ](https://docs.triumpharcade.com/frequently-asked-questions-regulatory-and-legal)
- [Triumph Docs — Terms of Use](https://docs.triumpharcade.com/terms-of-use)
- [Triumph Arcade Success Story — Snapchat for Business](https://forbusiness.snapchat.com/inspiration/triumph-arcade-success-story)
- [Triumph App Review: Is It Legit? — Bonus.com (2026)](https://www.bonus.com/money-skill-games/triumph-arcade/)
- [Triumph Arcade — f4.fund](https://f4.fund/startups/triumpharcade)
- [Triumph Labs — PitchBook](https://pitchbook.com/profiles/company/489814-66)
- [Triumph — LinkedIn](https://www.linkedin.com/company/triumphlabs)
