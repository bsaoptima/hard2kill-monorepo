# Changelog

## April 14, 2026

### Session 1 — Foundation Build
**Focus:** Set up the coworker space and build the strategic foundation.

- Created coworker space structure: `vision/`, `product/`, `marketing/`, `knowledge/`, `engineering/`
- **FOCUS.md** — 30-day, $5K plan to reach 20 DAU. Four phases: Build (challenge links, bonus balance, bot limit), Seed (Discord wager communities, tournaments, bounties, prop players), Content (TikTok/Shorts clips), Scale What Works.
- **vision/WHAT_ARE_WE.md** — Identity doc. Hard2Kill = skill-based betting platform, not indie game studio. Framed against DraftKings/Stake/Skillz.
- **vision/MARKET_SIZING.md** — TAM/SAM/SOM with real numbers. Real-money skill games $22B → $72B by 2034.
- **vision/REGULATORY_STRATEGY.md** — Skill gaming legality by state/country. 36+ US states legal without license.
- **vision/INVESTOR_MEMO.md** — Full pitch doc. Problem/solution/market/roadmap/GTM/team. Raise amount TBD.
- **product/COLD_START_PLAN.md** — Detailed cold start playbook.
- **product/TOURNAMENT_DESIGN.md** — Manual tournament flow using Discord + Challonge + challenge links.
- **marketing/GTM_PLAYBOOK.md** — Go-to-market strategy targeting wager Discord communities.
- **marketing/FIRST_50_DAU.md** — Granular tactics for first 50 daily active users.
- **marketing/ACTION_PLAN.md** — Weekly action items.
- **marketing/DISCORD_INFILTRATION.md** — Server-by-server plan for wager community outreach.
- **knowledge/GROWTH_TACTICS_LOG.md** — Running log of growth ideas and results.
- **knowledge/WAGER_DISCORD_SERVERS.md** — Directory of target Discord servers.
- **knowledge/competitors/SKILLZ.md** — Deep dive on Skillz ($16B peak → 99.6% decline).
- **knowledge/competitors/PLAYERS_LOUNGE.md** — Deep dive on Players' Lounge (YC, Drake, 1.5★).

## April 27, 2026

- **knowledge/competitors/TRIUMPH_ARCADE.md** — Deep dive on Triumph Arcade (Stanford founders, $26.2M raised, 7 employees, 902K App Store reviews at 4.7/5, ~$20M ARR via 20% rake on casual mobile skill games + B2B SDK). Verdict: serious operator in the casual-mobile skill segment but zero overlap with H2K's competitive PvP audience. Validates the model; doesn't threaten H2K's lane.

## June 7, 2026

### Strategic Pivot to Geostakes
**Focus:** Build and validate Geostakes (GeoGuessr-style wagering) before scaling Hard2Kill.

**Rationale:**
- Hard2Kill required complex real-time infrastructure (Colyseus, multiplayer sync)
- No existing player base to justify $5K marketing spend
- Geostakes offers simpler async matching, proven game mechanic, existing GeoGuessr audience (340k+ r/geoguessr members)

**What's Built:**
- **Core Platform:** Landing page with live match grid, stake picker ($1/$5/$10), latest wins leaderboard, FAQ, glass-card UI
- **Game Flow:** 5-round matches, 60s countdown, server-authoritative timer, distance-based scoring, async seed-based matching with score bands
- **Financial System:** Stripe deposits, 100% first deposit bonus (separate bonus balance), withdrawal system (bank/debit/stablecoin), 10% house rake, atomic balance operations
- **User Features:** Supabase auth, profile page (win rate, P/L, match history), leaderboard (top 10), balance display (cash + bonus), bonus eligibility badge
- **Marketing Assets:** 15 pre-built social slideshows at `/slides` for TikTok/Reels/Shorts (English + Portuguese variants)

**Recent Code Changes:**
- Added Profile link to header navigation (`geostakes/components/header.tsx`)
- Created `/profile` page with user stats and leaderboard (dummy data, ready to wire)
- Created `/slides` page with 15 story-based slideshows for social content
- Made auth title dynamic ("Login" vs "Sign up")
- Applied glass-card styling globally
- Added bonus banner for logged-out users

**Next Actions:**
1. Wire profile page to real Supabase data
2. Test end-to-end deposit → play → withdraw flow
3. Record 3-5 gameplay sessions for TikTok/Reels content
4. Soft launch to 5-10 friends for bug testing
5. Create 10 social videos from recorded gameplay
6. Strategic Reddit/streamer outreach

**Key Learnings:**
- Async matching > real-time servers (simpler, cheaper, more reliable)
- Bonus balance system essential from day 1 (prevents abuse)
- Social proof (leaderboard, latest wins) drives trust
- Pre-built marketing assets enable fast iteration
- Profile page drives retention (stat checking is addictive)
- Score bands prevent skill mismatch frustration

**Updated Files:**
- `coworker/FOCUS.md` — Replaced Hard2Kill 4-phase plan with Geostakes launch strategy
- `coworker/CHANGELOG.md` — This entry
- Untracked: `SLIDESHOW_HOOKS.md`, `SLIDESHOW_POSTS.md` (marketing content templates)
