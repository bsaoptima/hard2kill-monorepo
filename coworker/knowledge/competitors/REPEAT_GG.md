# Competitor Deep Dive: Repeat.gg

> Last updated: April 15, 2026

---

## Company Overview

**What they are:** An automated esports tournament platform that uses game publisher APIs to track player stats and run asynchronous leaderboard-style competitions. Players compete in their favorite games (Fortnite, COD, League of Legends, etc.) and Repeat automatically pulls their in-game stats to determine rankings and payouts. No manual score reporting, no disputes, no video evidence. The API does the work.

**Founded:** 2015 (originally as XY Gaming; rebranded to Repeat.gg in November 2019)

**Founders:**
- **Aaron Fletcher** -- CEO. Australian. Started in gaming retail management, then founded ProGaming LTD in 2009 (online transactional platform for competitive gaming on PC/console). Became CEO of XY Gaming in 2015. Injured his knee playing basketball, started gaming competitively, saw the opportunity to bring prize money tournaments to the web. Now holds the title "Director of Esports/Gaming at PlayStation" post-acquisition.
- **James Beamish-White** -- CTO. 10 years of experience. Previously founder/CEO of TEIQ, a multinational software development company. BSc + Postgrad Business degree.
- **Richard Edmonds** -- CFO. Previously CFO at ProGaming LTD. Accountant who has grown and sold 3 tech businesses.

**Headquarters:** San Francisco, CA (team originally from Australia, distributed across 4 continents)

**Employees:** ~21 (as of February 2026)

**Website:** repeat.gg

**Legal entity:** Repeat Technologies, Inc.

---

## The Full Timeline

### Phase 1: XY Gaming (2013-2019)

- April 2013: XY Gaming founded by professional gamers and IT professionals, building a "fast and fair system of skilled gaming for cash"
- 2015: Aaron Fletcher becomes CEO. Platform runs tournaments for games like League of Legends, Dota 2, CS:GO
- Core differentiator from day one: **automatic stat tracking via game APIs** -- no manual score reporting
- Built the asynchronous tournament model: play on your own time, platform pulls your stats, leaderboard determines winners
- Modest scale -- small team, niche platform, competitive but not mainstream

### Phase 2: Rebrand + Seed Round (2019)

- September 2019: Raised **$2.5M seed** from KB Partners, Varga Capital, Natural Bridge Fund, and others
- November 2019: Rebranded from XY Gaming to Repeat.gg
- Complete website redesign, new logo, doubled the team
- Added Fortnite support -- this changed everything

### Phase 3: Fortnite Explosion + Brand Platform (2020-2021)

- **Fortnite nearly broke the site.** Partnered with GFUEL for a $5,000 Fortnite tournament. When it went live, 14,000 users flooded the platform simultaneously, crashing the site. Australian dev team fixed it overnight. After that, they 10x'd their infrastructure to handle millions.
- **550% user growth in Q4 2020** (COVID + Fortnite tailwind)
- By early 2021: 75,000+ tournaments hosted, 60 million games played, 4+ million entrants
- March 2021: Launched "all-in-one tournament platform for brands" -- the B2B play
  - Brands could run automated esports campaigns with geo-targeting, A/B testing, ROI dashboards
  - Notable brand partners: **U.S. Army** (multiple campaigns), **Totino's Pizza Rolls**, **Papa John's**, **GFUEL** (via Team Kungarna)
  - OpTic Gaming ran a $10,000 Battlefield tournament on the platform
  - Tribe Gaming x Repeat Brawl Stars tournament filled up in 3 days with 20,000 entries

### Phase 4: Sony Acquisition (July 2022)

- **July 18, 2022: Sony Interactive Entertainment acquires Repeat.gg.** Terms undisclosed.
- At acquisition: 100,000+ tournaments hosted, 2.3 million participants, ~270 million individual matches played
- Part of Sony's aggressive esports strategy alongside the **EVO acquisition** (March 2021) and **Bungie acquisition** (2022)
- Steven Roberts (VP of Global Competitive Gaming at SIE): "Our vision for esports has always been about breaking down barriers for gamers to compete at all levels."
- Repeat committed to remaining multiplatform (PC, mobile, Xbox, not just PlayStation)
- Aaron Fletcher became Director of Esports/Gaming at PlayStation

### Phase 5: PlayStation Integration + Current State (2023-2026)

- Repeat's technology now powers the **PlayStation Competition Center** (compete.playstation.com)
- PS5 users can find tournament cards directly in the Game Hub, Control Center, and in-game -- no separate app needed
- Results automatically recorded on PS5 -- winning a match advances you to the next round
- **PlayStation Tournaments: XP** -- first live event held January 18, 2025 in London, with qualifying players from around the globe
- **Road to Esports World Cup** run through PlayStation Tournaments (2025)
- Current games on the platform: EA FC 25/26, NBA 2K25/26, College Football 25/26, Rocket League, Dota 2, League of Legends, PUBG, Brawl Stars, Madden, Battlefield, Fortnite (paused as of mid-2023)
- Launched iOS and Android mobile apps (2024)
- Launching Teams & Lobbies features in 2026
- ~1.4 million monthly website visitors (as of May 2023 data)
- 344 million total games played (cumulative, as of May 2023)
- ~21 employees across 4 continents
- **The platform is alive and active.** Running tournaments with cash prizes daily. Latest promoted event: $13,500 in prizes across 8 tournaments (Dec 2025-Jan 2026)

---

## How They Work

### The Asynchronous Tournament Model

```
Player links game account (gamertag, Riot ID, Epic ID, etc.)
         |
Enters a tournament (free or paid entry)
         |
Plays their game normally -- solo queue, ranked, whatever the tournament specifies
         |
Repeat's API pulls official stats from game publisher APIs periodically
         |
Stats processed into tournament-specific scoring (e.g., kills x10 + placement points)
         |
Only your best N matches count (top 3, top 10, or top 20 depending on tournament length)
         |
Leaderboard ranks all participants. Top finishers win prizes.
         |
Your score can only go up -- bad games don't hurt you
```

**Key insight:** This is NOT real-time PvP. You never play "against" someone on Repeat. You play your normal games, and the platform compares your stats to everyone else's stats. It's more like a daily fantasy league for gaming than a head-to-head match.

### Scoring Example (Fortnite)

- Kills: 10 points each
- Placement: variable points based on finish position
- Only top 3 matches count toward final score
- Scores refresh approximately hourly
- Recommended: wait 10-15 minutes between games for accurate tracking (games merge if queued too quickly)

### Score Collection (Technical)

- Repeat pulls official player statistics from game developer APIs at periodic intervals
- Raw stats processed according to tournament-specific scoring rules
- Not real-time -- up to 60 minutes for scores to appear, often faster
- "Update Results" button available if auto-refresh fails
- Designed to avoid overloading game servers by not tracking per-minute

### Prize Distribution

- Cash prizes: $200-$400 per daily tournament typical, $1,000-$5,000 for special events
- First place: typically $50-$80 in daily tournaments
- Tens to hundreds of users paid per tournament
- **Payout methods:** PayPal (instant), Direct Deposit, Check (up to 15 days), Wire Transfer, Gift Cards (Steam, PlayStation, Xbox, Amazon, Apple, Google Play)
- **Minimum withdrawal:** $10
- **Fees:** $0.30 + 2.9% on PayPal
- **Coin system:** 1 coin = $0.00007143. Gift cards redeemable at ~140,000 coins per $10

### Verification System

- Game ID linked at signup (verified in seconds)
- Verified vs. unverified player distinction (unverified players are a community complaint)
- Smurfing detection (imperfect -- major user complaint)

---

## Games Supported

### Current (2026)

| Game | Platform | Notes |
|------|----------|-------|
| EA Sports FC 25/26 | PC/Console | Major title, PlayStation Tournaments featured |
| NBA 2K25/26 | PC/Console | PlayStation Tournaments featured |
| College Football 25/26 | Console | PlayStation Tournaments featured |
| Rocket League | PC/Console | $2,000 prize pools |
| League of Legends | PC | $1,000 prize pools, legacy title |
| Dota 2 | PC | $1,000 prize pools, legacy title |
| PUBG | PC/Console | $1,000 prize pools |
| Brawl Stars | Mobile | Strong engagement (20K entries in Tribe Gaming event) |
| Madden 25 | Console | $1,000 prize pools |
| Battlefield | PC/Console | OpTic $10K tournament |
| Fortnite | PC/Console | **Paused** as of mid-2023 (API/tracking issues) |

### Historical (no longer active)

- Call of Duty: Warzone (was a top title pre-acquisition)
- Apex Legends (mentioned in early marketing)
- CS:GO / CS2

**Volume drivers:** Fortnite was the biggest growth driver pre-acquisition. Post-acquisition, EA Sports titles (FC, Madden, NBA 2K) dominate due to PlayStation Tournaments integration.

---

## Revenue / Unit Economics

### Revenue Model

Repeat's revenue model shifted dramatically with the Sony acquisition.

**Pre-acquisition (2019-2022):**

| Stream | How It Works |
|--------|-------------|
| **Branded tournaments (B2B)** | Brands pay Repeat to run automated esports campaigns. U.S. Army, Totino's, Papa John's, GFUEL all ran paid campaigns. Brands get geo-targeting, A/B testing, analytics dashboards, ROI measurement. |
| **Paid entry tournaments** | Some tournaments charge cash or coin entry fees. Platform keeps a cut. |
| **Entry conditions** | Brands can require app downloads, browser extensions, surveys, or product purchases as "entry fees" -- Repeat monetizes these lead-gen actions. |
| **Advertising** | On-site ads and sponsored content. |

**Post-acquisition (2022-present):**

- Revenue model is largely **subsidized by Sony.** Prize pools funded by PlayStation/publishers.
- B2B brand partnerships continue but at a smaller scale
- Platform operates more as a **user engagement / retention tool for PlayStation** than an independent business
- Works directly with game publishers to increase player LTV through competitive engagement loops
- Revenue estimate: $50M-$100M range (Growjo estimate, likely includes PlayStation Tournaments value)

### Key Difference From Hard2Kill

Repeat was never primarily a wagering platform. Most tournaments are **free to enter** with platform-funded or sponsor-funded prize pools. The revenue comes from brands and publishers paying for engagement, not from taking a rake on player wagers. This is fundamentally different from the Players' Lounge / Hard2Kill model.

---

## User Demographics

- **2.3 million participants** at time of acquisition (July 2022)
- **344 million total games tracked** (cumulative by May 2023)
- **~1.4 million monthly website visitors** (May 2023)
- **~975K monthly visits** (January 2026)
- **Global:** Available in 70+ countries (post-Sony acquisition)
- **Platforms:** PC, PlayStation, Xbox, Mobile, Switch
- **Age:** Skews younger (Fortnite/COD/Rocket League audience = 16-28)
- **Gender:** Not disclosed, but given game mix (shooters, MOBAs, sports) likely 80%+ male
- **Skill level:** Mixed -- matchmaking leaderboards segment by skill, but high-skill players dominate prize payouts
- **Trustpilot:** 3.9/5 stars, 940 reviews (far better than Players' Lounge's 1.5 stars)

---

## The Sony Acquisition

### Why Sony Bought Them

1. **Tournament infrastructure.** Sony wanted to embed competitive gaming directly into PS5 -- not as a separate app, but as a native OS feature. Repeat's technology (API score tracking, automated tournament management, leaderboard systems, prize fulfillment) was the engine they needed.

2. **Esports strategy trilogy.** Sony acquired EVO (fighting game tournaments, March 2021), Bungie (live service games, 2022), and Repeat.gg (tournament tech, July 2022). Together: the IP (Bungie games), the events (EVO), and the infrastructure (Repeat).

3. **Publisher relationships.** Repeat already had API integrations with Epic (Fortnite), Riot (LoL), Valve (Dota 2, CS:GO), EA (multiple titles), and others. Sony didn't want to negotiate those from scratch.

4. **Democratize esports.** Sony's stated goal was making competitive gaming accessible to casual players, not just pros. Repeat's asynchronous model (play on your own time, your best games count) is perfect for casual competitive players who can't commit to scheduled brackets.

5. **Data.** 270 million matches worth of player performance data across major titles.

### Deal Terms

Undisclosed. Given $2.5M raised and ~16-21 person team, likely in the $10M-$30M range (educated guess based on comparable acqui-hires in gaming).

### What Happened Post-Acquisition

- Repeat's tech was integrated into the **PlayStation Competition Center** at compete.playstation.com
- PS5 tournaments became native -- accessible directly from the Game Hub and Control Center
- Platform remained multiplatform (PC, Xbox, mobile still supported on repeat.gg)
- Aaron Fletcher became Director of Esports/Gaming at PlayStation
- Team stayed small (~21 people) -- this was a technology acquisition, not a growth-stage company purchase
- PlayStation Tournaments expanded to 30+ games across 70+ countries
- **PlayStation Tournaments: XP** -- first live event (London, January 2025) with global qualifying
- **Road to Esports World Cup** qualifiers run through PlayStation Tournaments (2025)

---

## Current Status (April 2026)

**ALIVE.** Not just alive -- thriving as Sony's tournament backbone.

**Repeat.gg (the standalone platform):**
- Still operational at repeat.gg
- Running daily/weekly tournaments with cash prizes
- iOS and Android apps available
- ~975K monthly website visits
- Launching Teams & Lobbies features in 2026
- ~21 employees

**PlayStation Competition Center (the bigger story):**
- Repeat's technology powers compete.playstation.com
- Native PS5 integration (tournaments in Game Hub, Control Center, in-game)
- EA FC 26, NBA 2K26, Tekken 8, and more
- Live events: PlayStation Tournaments: XP (London, January 2025)
- Road to Esports World Cup qualifying pathway
- 30+ games, 70+ countries

**The bottom line:** Repeat.gg didn't get shut down or wound down post-acquisition. It got promoted. The standalone site continues, and the core technology now powers PlayStation's entire competitive gaming infrastructure. This is the rare acquisition-goes-well story.

---

## Strengths

1. **API-based automatic score verification** -- the core differentiator. No manual reporting, no disputes, no video evidence. The game's own data decides who won. This eliminates the entire dispute/trust problem that plagues Players' Lounge.

2. **Asynchronous = no cold start problem.** You don't need two players online simultaneously. You play on your own time, platform compares everyone's stats at the end. No empty lobbies, no wait times.

3. **Sony backing + PlayStation integration.** Native PS5 integration is a distribution advantage nobody else has. Tournament cards appear right in the Game Hub -- zero friction to discover and enter.

4. **Multiplatform, multi-game.** Supports PC, PlayStation, Xbox, Mobile, Switch across 10+ major titles. Meets players where they already are.

5. **Brand monetization model.** Instead of relying solely on player rake, Repeat gets brands to fund prize pools. Players enter free, brands pay for engagement data and marketing exposure. Clever B2B/B2C hybrid.

6. **Trustpilot 3.9/5.** 940 reviews. Dramatically better trust signal than Players' Lounge (1.5/5) or most competitors.

7. **Global from day one.** Available in 70+ countries. No US-only restriction.

8. **Matchmaking leaderboards.** Skill-based segmentation means casual players compete against other casuals, not pros. Reduces the "whale problem."

---

## Weaknesses / What Went Wrong

1. **Not a real PvP platform.** Asynchronous leaderboard tournaments remove the competitive adrenaline. You never see your opponent. You never feel the "I just beat you" moment. It's closer to a stats contest than a match.

2. **Smurfing is rampant.** Major Trustpilot complaint: unverified players create new accounts to dominate lower-skill leaderboards. Platform hasn't solved this despite years of trying.

3. **Prize pools are tiny.** $50-$80 for first place in a daily tournament. Compare to Players' Lounge where a single $100 wager pays $180 to the winner. Repeat doesn't attract serious money players.

4. **No wagering model.** Repeat is not a betting platform. Players don't stake their own money on outcomes. This means no rake revenue, no high-stakes engagement, no "I have skin in the game" retention loop.

5. **API dependency on game publishers.** When Fortnite changed its API or tracking methods, Repeat had to pause Fortnite tournaments (their biggest game). You're at the mercy of publishers who can cut API access at any time.

6. **Revenue model requires Sony subsidy.** Without Sony funding prize pools, the economics don't obviously work. Free-to-enter tournaments with cash prizes = Repeat loses money on every tournament unless brands or Sony cover the cost.

7. **Small team (21 people) for a Sony subsidiary.** Suggests Sony views this as a feature team, not a standalone business. Could be deprioritized if Sony's esports strategy shifts.

8. **Fortnite -- their biggest game -- is paused.** The game that drove 550% growth in Q4 2020 is currently not available for tournaments. That's a massive gap.

---

## Hard2Kill vs. Repeat.gg

### Where Hard2Kill Is Stronger

| Advantage | Why It Matters |
|-----------|---------------|
| **Real-time PvP** | Repeat is asynchronous leaderboard stats comparison. You never see your opponent, never feel the heat. Hard2Kill is live, real-time, in-your-face PvP. The adrenaline is the product. |
| **Wagering / skin in the game** | Repeat gives away free prize pools. Hard2Kill lets players stake their own money. Staking your own cash creates 10x the engagement and retention of a free-entry tournament. |
| **Server-authoritative integrity** | Repeat trusts game publisher APIs for data. If the API is slow, inaccurate, or gets revoked, tournaments break. Hard2Kill IS the game AND the server -- you don't depend on anyone else's API. |
| **No API dependency** | Repeat's Fortnite -- their biggest title -- got paused because of API/tracking issues. Hard2Kill can never be API-blocked because you own the entire stack. |
| **Instant results** | Repeat takes up to 60 minutes to update scores. Hard2Kill knows who won the instant the match ends. Instant gratification. |
| **No smurfing possible** | Repeat's biggest community complaint is smurfs dominating leaderboards. On Hard2Kill, server-authoritative matchmaking and a single-game ecosystem make smurfing far harder. |
| **Higher stakes per session** | Repeat pays $50-$80 for first place after days of grinding. Hard2Kill can pay out $9 on a $5 wager in 3 minutes. The per-session reward density is incomparable. |

### Where Repeat.gg Is Stronger

| Advantage | Why It Matters |
|-----------|---------------|
| **Games people already play** | Repeat supports Fortnite, League, Rocket League, EA FC -- games with millions of existing players. Hard2Kill requires people to learn an unknown game AND trust it with money. |
| **PlayStation native distribution** | Tournament cards appear in the PS5 Game Hub. 100M+ PS5 owners can discover tournaments with zero effort. Hard2Kill has no platform distribution. |
| **Sony backing** | Functionally unlimited resources, publisher relationships, brand credibility. Hard2Kill has $5K and one founder. |
| **No cold start problem** | Asynchronous means you never wait for an opponent. Play anytime, platform compares stats later. Hard2Kill needs concurrent players (or bots). |
| **Brand partnerships / B2B revenue** | U.S. Army, Totino's, Papa John's, GFUEL fund prize pools. Hard2Kill has no brand partnerships and no B2B revenue stream. |
| **Global availability** | 70+ countries. Hard2Kill hasn't addressed international expansion or regulatory compliance. |
| **3.9/5 Trustpilot** | 940 reviews, mostly positive. Hard2Kill has zero reviews and zero brand trust. |
| **Regulatory non-issue** | Free-to-enter tournaments dodge gambling regulations entirely. Hard2Kill's real-money wagering model triggers state-by-state skill gaming laws. |

### The Strategic Comparison

| Dimension | Repeat.gg | Hard2Kill |
|-----------|-----------|-----------|
| **Model** | Asynchronous leaderboard tournaments on existing games | Real-time PvP wagering on owned games |
| **Revenue source** | Brands + Sony subsidize prizes | Player wagers (rake) |
| **Parent** | Sony Interactive Entertainment | Solo founder |
| **Employees** | ~21 | 1 |
| **Funding** | $2.5M raised + Sony acquisition | Bootstrapped ($5K) |
| **Games** | 10+ major AAA titles | 2 custom games |
| **Cold start** | Solved (async) | Partially solved (5s bot backfill) |
| **Integrity** | API-based (trusts publisher data) | Server-authoritative (you ARE the data) |
| **Excitement** | Low (leaderboard, no live opponent) | High (real-time, money on the line) |
| **Legal risk** | Near zero (free-to-enter) | High (real-money wagering) |
| **Trustpilot** | 3.9/5 (940 reviews) | N/A |

---

## Key Lessons for Hard2Kill

### 1. API-based verification on existing games is powerful but fragile

Repeat proved that automatic score verification via game APIs eliminates disputes and builds trust (3.9/5 Trustpilot vs. Players' Lounge's 1.5/5). But they also proved the fatal flaw: when Fortnite changed its API, their biggest game got paused. **If you're considering pivoting to a "verification layer on existing games" model, understand that you'd be renting access to someone else's data pipeline. They can revoke it at any time.** Owning your games means owning your data. That's a moat, not a limitation.

### 2. Asynchronous kills the adrenaline but solves the cold start

Repeat's async model means you never need two players online at once. No empty lobbies, no wait times. But it also means there's no live PvP tension -- it's a stats contest, not a fight. **Your real-time PvP is a genuine competitive advantage in engagement, but you pay for it with the cold start problem.** Your 5-second bot backfill is the right solution -- it gives you the best of both worlds (instant matches + live opponents).

### 3. Free-to-enter dodges every regulatory problem

Repeat has zero gambling regulation issues because players don't stake money. Free entry + platform-funded prizes = it's a promotional giveaway, not gambling. **This is why Repeat can operate in 70+ countries while Players' Lounge is blocked in 14 US states.** Hard2Kill's real-money wagering model will inevitably face regulatory friction. Consider offering a free-to-enter tournament mode alongside wagering -- it could be your growth lever in restricted jurisdictions.

### 4. Brands will pay to reach gamers if you give them a turnkey platform

Repeat's B2B model -- brands fund prize pools, platform provides targeting + analytics -- is clever because it makes the platform free for players while monetizing brands. The U.S. Army, Papa John's, and Totino's all paid for this. **Hard2Kill could offer branded tournament sponsorships (e.g., "The Monster Energy GladiatorZ Cup -- $500 prize pool, free to enter") as a way to drive top-of-funnel growth without spending your own $5K budget.**

### 5. Sony acquired them for the tech, not the business

Repeat raised only $2.5M and had ~16-21 employees. They weren't a unicorn. Sony wanted the tournament infrastructure -- API integrations, automated management, leaderboard systems, prize fulfillment. **This validates that tournament/competitive infrastructure is strategically valuable to platform companies.** If Hard2Kill builds robust competitive infrastructure on its owned games, that IP has potential acqui-hire value to larger platforms.

### 6. The "best N of M games" format is worth stealing

Repeat's format where only your top 3/10/20 matches count is genius for retention. Bad games don't hurt you, so players keep playing to improve their best scores. **Hard2Kill could adapt this: "play 5 matches for $2 entry, your best 3 count toward the leaderboard, top 10 split the prize pool." This extends session time and softens the blow of individual losses.**

### 7. PlayStation-native distribution is an unfair advantage you can't replicate

Repeat's biggest post-acquisition strength is appearing directly in the PS5 Game Hub. 100M+ console owners see tournament cards without downloading anything or visiting a website. **You will never have this.** Don't try to compete on distribution with a Sony subsidiary. Compete on experience intensity -- the thing a leaderboard tournament platform structurally cannot deliver.

---

## Sources

- [PlayStation acquires Repeat.gg -- VGC](https://www.videogameschronicle.com/news/playstation-is-acquiring-esports-tournament-platform-repeat-gg/)
- [PlayStation acquires technology giant Repeat.gg -- Game Developer](https://www.gamedeveloper.com/business/playstation-acquires-repeatgg-esports)
- [Sony acquires Repeat.gg, continuing PlayStation's esports expansion -- Esports Insider](https://esportsinsider.com/2022/07/sony-repeat-acquisition-playstation-esports)
- [Sony Acquires Repeat.gg -- Hypebeast](https://hypebeast.com/2022/7/sony-playstation-esports-tournament-platform-repeat-gg-acquisition)
- [PlayStation makes a big esports play -- Digital Trends](https://www.digitaltrends.com/gaming/playstation-repeat-esports/)
- [Repeat Launches Brand Tournament Platform -- PRWeb](https://www.prweb.com/releases/repeat-launches-industry-s-first-all-in-one-tournament-platform-for-brands-to-run-results-driven-automated-esports-campaigns-895818630.html)
- [XY Gaming Rebranding to Repeat -- Repeat.gg Blog](https://www.repeat.gg/content/xy-gaming-re-branding-repeat-fortnite/)
- [Repeat.gg Review -- PaidFromSurveys](https://paidfromsurveys.com/repeat-gg-review)
- [Repeat.gg Stats & Overview -- SwiftSalary](https://www.swiftsalary.com/platform/repeat-gg/)
- [Repeat.gg Trustpilot Reviews (3.9/5, 940 reviews)](https://www.trustpilot.com/review/repeat.gg)
- [Aaron Fletcher -- Rolling Stone Culture Council](https://council.rollingstone.com/profile/Aaron-Fletcher-CEO-Repeat/c49b4683-e074-4303-a6d0-18e87b2345d4)
- [Repeat.gg -- Crunchbase](https://www.crunchbase.com/organization/repeat-gaming)
- [Repeat.gg -- Tracxn Company Profile](https://tracxn.com/d/companies/repeat.gg/__akMBR5DXt4fh0zpZB-DuabVCEp29PlNpbNhoL7WYf3U)
- [PlayStation Competition Center](https://compete.playstation.com/en-us/all)
- [Repeat.gg Homepage](https://www.repeat.gg/)
- [How to Compete on PS5 -- PlayStation Competition Center](https://compete.playstation.com/en-us/all/how-to/ps5)
- [PlayStation Tournaments: XP Announcement -- PlayStation Blog](https://blog.playstation.com/2024/12/05/announcing-playstation-tournaments-xp-a-new-live-studio-event-and-competition-open-to-the-global-ps5-community/)
- [Repeat.gg launches brand-focused esports tournament platform -- Esports Insider](https://esportsinsider.com/2021/03/repeat-gg-esports-marketing)
