# Competitor Deep Dive: Skillz (SKLZ)

> Last updated: April 14, 2026

---

## Company Overview

**What they are:** A platform/SDK that lets third-party mobile game developers add real-money tournaments to their games. Skillz doesn't make games — they provide the infrastructure (matchmaking, payments, anti-cheat, scoring) and handle user acquisition. Developers plug in the Skillz SDK, and their casual games become cash-competition esports.

**Founded:** 2012 (originally as "Lookout Gaming"), Boston, MA

**Founders:**
- **Andrew Paradise** — CEO. Learned to code at age 7 by hacking a video game. Previously founded AisleBuyer (mobile self-checkout), sold to Intuit in 2012 for a reported $80-100M. Worked in private equity (Fort Washington Capital Partners, The Watermill Group) before tech.
- **Casey Chafkin** — Chief Revenue Officer. Started as an intern, became employee #4 while finishing his Harvard MBA. Previously VP of Business Development at AisleBuyer.

**Headquarters:** Las Vegas, NV (moved from San Francisco; also has operations in Bangalore)

**Public:** NYSE: SKLZ (went public via SPAC December 2020)

**Website:** skillz.com

---

## The Full Timeline

### 2012-2016: Building the Platform
- Founded in an attic in Boston as "Lookout Gaming"
- Raised $500K seed in first year
- 2013: Publicly launched the platform + $9.8M Series A
- Built the SDK model: developers integrate Skillz, games become real-money tournaments
- Focused on mobile-first, casual games (puzzle, card, word games)
- Early games: Solitaire, Bingo, 21 Blitz-style casual titles

### 2017-2019: Scale
- Platform revenues went from $200M to $400M GMV in five months (2019)
- Top 10 earners combined for ~$25M in 2019 prize winnings
- 7 of top 10 earners were female — unusual for competitive gaming
- Users spent ~30 minutes/day on platform
- Engagement metrics beat Netflix and Facebook in session stickiness (per CNBC)
- 50/50 male-female user split — rare in gaming

### 2020: SPAC IPO + COVID Boom
- **December 2020:** Went public via SPAC at $3.5B implied valuation
- Stock soared — Cathie Wood's ARK Invest bought 7% of equity
- **All-time high: $874.40** per share (February 5, 2021) — **$16 billion market cap**
- COVID lockdowns drove massive engagement growth
- Skillz spent 112% of revenue on marketing in Q3 2021 — aggressively buying users

### 2021-2022: The Crash Begins
- **Apple's App Tracking Transparency (ATT)** launched April 2021
  - Killed cross-app user tracking. Opt-in rates near zero.
  - User acquisition costs spiked industry-wide
  - Skillz's entire model depended on cheap, repeatable mobile UA → this broke it
- **Google Play Store** continued refusing real-money gaming apps on Android
  - Android users must use browser → conversion tanks
- Revenue peaked ~$400M GMV, then started declining
- Marketing spend was unsustainable — spending more on acquiring users than users generated in lifetime value
- Stock entered freefall

### 2023: Revenue Collapse
- **Full year revenue: $152M** (down from $260M in 2022)
- Massive cost-cutting: layoffs, moved operations to Las Vegas and Bangalore
- SEC reprimanded Skillz for using non-standard financial metrics
- Paying users declining quarter over quarter

### 2024: Continued Decline
- **Full year revenue: ~$93-95M** (down 37-39% from 2023)
- Q4 2024 revenue: $20.4M
- Net loss: $26.4M for the year
- Paying users: declining toward 146,000

### 2025-2026: Survival Mode
- **Q2 2025 revenue: $27M** (annualized ~$108M, but trend is down)
- **Paying users: ~146,000** (down from 500,000+ at peak)
- **Market cap: ~$60M** (down from $16B peak — **99.6% decline**)
- **Stock price: ~$3.39** (down from $874 peak)
- **Cash: $229M** but $130M in debt maturing soon
- **Estimated runway: <2 years** if nothing changes
- Launched $75M Developer Accelerator to attract new game studios
- Pivoting from pure casual games to broader genres (RTS, FPS)
- Shifting from user acquisition to user reactivation

---

## How Skillz Works (Business Model)

### The SDK Model

```
Developer builds a mobile game
         ↓
Integrates Skillz SDK (matchmaking, payments, anti-cheat, scoring)
         ↓
Game becomes real-money tournament enabled
         ↓
Skillz handles user acquisition + payment processing
         ↓
Revenue split: Players get prizes, remainder split between Developer and Skillz
```

### How Tournaments Work

**Asynchronous (Most Common — "Play and Compare"):**
1. Player pays entry fee ($1-$100+)
2. Player plays the game immediately (doesn't wait for opponent)
3. Game records their score
4. Skillz matches them with another player who played the same game at a similar skill level
5. Higher score wins the pot
6. If no match found within 7 days, entry fee refunded

**Real-Time Synchronous:**
1. Player pays entry fee
2. Waits in queue for opponent
3. Both play simultaneously, seeing each other's progress
4. Higher score at end wins

**Key insight:** Most Skillz games are asynchronous. You're not playing against someone live — you're playing against their recorded score. This solves the cold start problem (no need for concurrent players) but removes the PvP adrenaline.

### Revenue Split

- Players pay entry fees → prize pool
- Winners get a percentage of the pool (variable, controlled by developer)
- Remainder split between developer and Skillz
- Developer gets 50-94% of the platform's share depending on the traffic they generate
- Apple's 30% App Store cut does NOT apply (real-money gaming is exempt from IAP rules)

### What Skillz Provides to Developers
- SDK for matchmaking, scoring, payments, anti-cheat
- User acquisition (historically nine-figure UA budgets)
- Analytics dashboard (installs, revenue, performance, user data)
- LiveOps support
- Fraud and fair play monitoring
- Billing and settlement services
- Patented skill-vs-chance analysis tool (must pass 75%+ skilled player win rate)

---

## Top Games on Skillz

| Game | Genre | Notes |
|------|-------|-------|
| **Blackout Bingo** | Bingo | By Big Run Studios. One of the top revenue drivers. |
| **Solitaire Cube** | Solitaire | By Tether Studios. Top earner. |
| **21 Blitz** | Card (Blackjack + Solitaire) | By Tether Studios. Top earner. |
| **Cube Cube** | Puzzle (Tetris-style) | Quick-play puzzle. |
| **Pool Payday** | Pool/Billiards | Casual sports. |
| **Dominoes Gold** | Dominoes | Classic board game. |
| **Big Buck Hunter: Marksman** | Shooting | Based on the arcade franchise. |
| **2 Minute Football** | Sports | Quick sports game. |

**Revenue concentration risk:** Three games — Solitaire Cube, 21 Blitz (both by Tether Studios), and Blackout Bingo (by Big Run) — generate over **79% of Skillz's revenue.** This is an extreme dependency. Tether Studios has had legal disputes with Skillz, making this even more precarious.

---

## User Demographics

- **Gender:** 50/50 male-female split (extremely rare in competitive gaming)
- **7 of top 10 earners** on the platform are female
- **Female players** took home $8M in prize money in one year
- **Game preferences:** Casual — puzzle, card, word, bingo, solitaire
- **Age:** Skews older than typical gaming (30-55 demographic heavily represented)
- **Session time:** ~30 minutes/day average
- **Geography:** 82% US-based (despite being available in ~75% of countries globally)

This is a completely different audience from Hard2Kill's. Skillz serves casual mobile gamers (predominantly women, 30-55, playing solitaire and bingo). Hard2Kill serves competitive gamers (predominantly young men, playing shooters for ego + money).

---

## What Went Wrong (The Five Killers)

### 1. Apple ATT (April 2021)
Apple's App Tracking Transparency update killed cross-app user tracking. Skillz's entire growth model was "spend money on targeted mobile ads → acquire users cheaply → users spend more than acquisition cost." When targeting broke, acquisition costs spiked 2-5x and the unit economics collapsed. This was the single biggest blow.

### 2. Google Play Store Ban
Google still won't allow real-money gaming apps on the Play Store. Android users must download via browser or sideload, which kills conversion rates. This locks Skillz out of ~50% of the mobile market.

### 3. Unsustainable Marketing Spend
In Q3 2021, Skillz spent **112% of revenue on sales and marketing.** They were burning money to buy growth that wasn't sticking. When ATT made acquisition expensive, there was no profitable path to growth.

### 4. Developer Concentration
79% of revenue from 3 games by 2 developers. When Tether Studios (maker of Solitaire Cube and 21 Blitz) had a legal dispute with Skillz, it threatened the majority of the business. The $75M accelerator is a direct response to this risk.

### 5. Asynchronous = Low Engagement
Playing against someone's recorded score isn't exciting. There's no real-time competition, no adrenaline, no "I just beat you" moment. Users churn because the experience feels like playing alone with money on the line — not like competing.

---

## Their Current Strategy ($75M Accelerator)

Skillz is betting its remaining runway on attracting new game developers:

- **$75M** allocated over 3 years to fund 25+ games
- Seeking games beyond casual (including RTS, FPS — your territory)
- Providing capital, marketing support, LiveOps expertise, and SDK
- Developer revenue share: 50-94% depending on traffic generated
- User LTV in skill-based gaming: $20 to $100+ (much higher than ad-supported mobile games)

**Translation:** Skillz realized they need better games with higher engagement. Solitaire and Bingo aren't enough. They're essentially looking for games like yours — competitive, real-time, skill-based. They're spending $75M to find developers who can build what you've already built.

---

## Skillz's Strengths

1. **SDK model scales effortlessly** — they don't build games, so adding new titles is low-cost
2. **Legal/regulatory playbook** — patented skill-vs-chance test, 8+ years of compliance experience
3. **Payment infrastructure** — handles deposits, payouts, fraud, taxes at scale
4. **Female audience** — cracked a demographic that most competitive platforms miss entirely
5. **Asynchronous solves cold start** — you don't need concurrent players (but at the cost of excitement)
6. **$229M cash** — they have runway to try things, even if the core business is shrinking
7. **Public company** — access to capital markets (dilutive, but available)

---

## Skillz's Weaknesses

1. **Revenue in freefall** — $400M peak → $95M in 2024 → trending lower
2. **User base collapsing** — 500K+ paying users → 146K
3. **Apple ATT broke their UA model** — no fix in sight
4. **Google Play Store ban** — locked out of half the mobile market
5. **79% revenue from 3 games** — catastrophic concentration risk
6. **Asynchronous = low engagement** — no real-time PvP excitement
7. **$130M debt maturing** — cash is depleting, debt is coming due
8. **Stock down 99.6%** — $16B to $60M. Investor confidence gone.
9. **No owned games** — entirely dependent on third-party developers who could leave

---

## Hard2Kill vs. Skillz

### Where Hard2Kill Is Stronger

| Advantage | Why It Matters |
|-----------|---------------|
| **Real-time PvP** | Skillz is mostly asynchronous (play against a recorded score). You have live, real-time matches with real opponents. The adrenaline is incomparable. |
| **You own the games** | Skillz depends on third-party developers who can leave (and have — see Tether dispute). You control your own games and destiny. |
| **Server-authoritative** | Skillz relies on client-side score reporting with anti-cheat algorithms. You have server-authoritative game state — the server IS the referee. |
| **Not dependent on mobile UA** | Skillz's model broke when Apple ATT killed mobile targeting. You're web-based, not app-store dependent. Discord, TikTok, Kick — your UA channels aren't gated by Apple or Google. |
| **Not locked out of Android** | Google won't let Skillz in the Play Store. Your web platform works on any browser on any device. |
| **Engaged competitive audience** | Skillz users play solitaire for 30 min. Your users play real-time shooters with real stakes — higher emotional investment, higher engagement. |
| **Simple model** | Skillz has a complex three-way split (players, developers, platform). You keep it simple: two players, winner takes pot (minus future rake). |

### Where Skillz Is Stronger

| Advantage | Why It Matters |
|-----------|---------------|
| **Asynchronous = no cold start** | You don't need two players online simultaneously. This is a massive structural advantage that Hard2Kill can only solve with bots. |
| **Game library breadth** | Hundreds of games on the Skillz platform across genres. Hard2Kill has 2. |
| **Female/casual audience** | 50/50 gender split, 30-55 age demographic. Hard2Kill is likely 90%+ male, 18-30. Skillz reaches a huge market that you don't. |
| **Payment infrastructure** | Deposits, withdrawals, fraud detection, tax compliance (1099s), all built and battle-tested at scale. You have basic Stripe integration. |
| **Regulatory/legal expertise** | Patented skill-vs-chance test, compliance in most US states, years of legal precedent. You have none of this yet. |
| **$229M cash** | Even in decline, they can fund experiments. You have $5K. |
| **Public company with institutional backing** | Access to capital markets, analyst coverage, institutional credibility. You're a solo founder. |
| **Data moat** | Billions of tournaments = massive dataset on player behavior, skill measurement, fraud patterns, matchmaking optimization. |

---

## Key Lessons From Skillz for Hard2Kill

### 1. Don't depend on app stores
Skillz's two biggest problems are Apple ATT and Google Play Store ban. You're web-based — this is a genuine structural advantage. **Never make an app-store-dependent move.** Stay web-first. If you build mobile apps later, treat them as secondary channels.

### 2. Don't depend on paid mobile UA
Skillz spent 112% of revenue on marketing and it still wasn't enough when targeting broke. Your channels (Discord, TikTok, Kick, challenge links) are organic/community-driven. That's not just cheaper — it's more resilient.

### 3. Real-time PvP is your moat
Skillz's asynchronous model solved cold start but killed engagement. Users playing against a recorded score don't feel competition. Your live PvP matches ARE the product. The person-you're-playing-against-is-right-there-and-one-of-you-is-about-to-lose-money feeling is what no async platform can replicate.

### 4. Own your games
79% of Skillz revenue depends on 3 games made by 2 external developers. One lawsuit, one disagreement, one developer walking away = existential threat. You own GladiatorZ and Wasteland. Nobody can take that from you.

### 5. The audience opportunity they proved
Skillz proved that 50% of competitive money gamers can be female, and the biggest spenders are 30-55 year olds. Your current games (arena shooters, FPS) probably won't attract that demographic — but this is a massive market to consider when you add new games later. A skill-based puzzle or card game on Hard2Kill could open this audience.

### 6. They're looking for you
Skillz's $75M accelerator is specifically seeking competitive, real-time, skill-based games — including FPS and RTS. They want what you've built. This could be:
- **An opportunity:** Apply to the accelerator. Get funded and get access to Skillz's user acquisition infrastructure.
- **A validation:** If a $60M public company is spending $75M to find games like yours, the market opportunity is real.
- **A competitive threat:** If they fund someone who builds a better real-time PvP platform, they could become a competitor.

Worth investigating, but with eyes open — being dependent on Skillz's platform would put you in the same position their current developers are in.

---

## The Big Picture: Skillz Proves the Market, Not the Model

Skillz proved that millions of people will pay money to compete in skill-based games. They hit $400M GMV. They went public at $3.5B. That's real validation.

But their specific model (SDK for async casual games, funded by mobile UA) is breaking. Revenue down 75%+ from peak. Users fleeing. Cash burning.

Hard2Kill doesn't have their model problems:
- You're not dependent on Apple or Google
- You're not dependent on third-party developers
- You're not async (your PvP is real-time)
- You're not spending 112% of revenue on UA

You DO have their market opportunity: people willing to bet money on their own skill.

The lesson isn't "do what Skillz did." It's "the demand Skillz proved exists is real — serve it with a better model."

---

## Sources

- [Andrew Paradise — Wikipedia](https://en.wikipedia.org/wiki/Andrew_Paradise)
- [Skillz — Wikipedia](https://en.wikipedia.org/wiki/Skillz_(company))
- [Skillz Reports 2024 Q4 and Full Year Results (Investor Relations)](https://investors.skillz.com/news/news-details/2025/Skillz-Reports-2024-Fourth-Quarter-and-Full-Year-2024-Results/default.aspx)
- [Skillz Revenue History 2018-2025 (StockAnalysis)](https://stockanalysis.com/stocks/sklz/revenue/)
- [Skillz: Anatomy of a Slow Burn (JunkBondInvestor)](https://www.junkbondinvestor.com/p/skillz-sklz-anatomy-of-a-slow-burn)
- [A Look Under the Hood of Skillz (Naavik)](https://naavik.co/deep-dives/a-look-under-hood-of-skillz/)
- [Inside the Skillz Developer Accelerator (Deconstructor of Fun)](https://www.deconstructoroffun.com/blog/2025/3/13/inside-the-skillz-developer-accelerator-why-75m-is-up-for-grabs-for-game-studios)
- [Skillz $75M Accelerator Launch (BusinessWire)](https://www.businesswire.com/news/home/20250225583017/en/Skillz-Launches-75-Million-Accelerator-Program-to-Support-Mobile-Game-Developers)
- [Skillz SPAC IPO — shares soar 29% (Fortune)](https://fortune.com/2020/12/17/skillz-shares-soar-in-trading-debut-mobile-e-sports/)
- [Skillz Stock Price History (MacroTrends)](https://www.macrotrends.net/stocks/charts/SKLZ/skillz/stock-price-history)
- [Skillz Spends 112% of Revenue on Marketing (Motley Fool)](https://www.fool.com/investing/2021/11/08/skillz-spends-aggressively-on-marketing-in-q3/)
- [Skillz hooks users more than Netflix and Facebook (CNBC)](https://www.cnbc.com/2019/05/17/skillz-esports-platform-hooks-users-more-than-facebook-and-netflix.html)
- [Skillz Legal: The Legality of Skill Gaming](https://docs.skillz.com/docs/legal-skillz/)
- [Skillz Matchmaking FAQ](https://support.skillz.com/hc/en-us/articles/211525983-How-does-Skillz-player-matching-work)
- [Skillz Revenue Model for Developers](https://www.skillz.com/news/fueling-epic-wins-skillz-puts-developers-first-with-innovative-revenue-model/)
