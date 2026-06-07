# CURRENT FOCUS

> Last updated: June 7, 2026

## Current Priority: Geostakes Launch

**Platform:** Geostakes (GeoGuessr-style 1v1 wagering)
**Status:** Core product complete, entering marketing phase
**Goal:** Validate skill-based wagering model with simpler, more accessible game before scaling Hard2Kill

---

## Why Geostakes First?

The original $5K Hard2Kill plan assumed challenge links, bonus balance system, and existing player base. Reality: none of those existed. Building Hard2Kill from scratch required:
- Complex multiplayer infrastructure (Colyseus rooms, real-time sync)
- Multiple game modes (coin flip, rock paper scissors, future skill games)
- Trust building for competitive PvP wagering

**Geostakes is simpler:**
- Async seed-based matching (no real-time servers)
- Single proven game mechanic (GeoGuessr is already trusted)
- Existing audience (r/geoguessr has 340k+ members who already play for fun)
- Lower skill ceiling (anyone can guess a location vs. competitive gaming)
- Built-in anti-cheat (25-second timer prevents Google lookups)

Validate the skill-wagering model with Geostakes, then apply learnings to Hard2Kill.

---

## What's Built (Geostakes)

### Core Platform ✅
- Landing page with live match grid (animated street view tiles showing active games)
- Stake picker ($1/$5/$10)
- Latest wins leaderboard
- FAQ addressing trust concerns
- Glass-card UI with dark theme

### Game Flow ✅
- 5-round matches with 60-second countdown per round
- Server-authoritative timer (prevents client manipulation)
- Distance-based scoring (closest guess wins)
- Auto-zero for timeouts
- Async seed-based matching (score bands prevent pro vs. casual mismatches)

### Financial System ✅
- Stripe deposit integration with webhooks
- 100% first deposit bonus (bonus balance tracked separately)
- Withdrawal system (bank/debit/stablecoin)
- 10% house rake on winning pots
- No rake on forfeits
- Atomic balance operations

### User Features ✅
- Auth via Supabase (login/signup with dynamic titles)
- Profile page with stats (win rate, profit/loss, match history)
- Leaderboard (top 10 players, highlighted current user)
- Balance display (cash + bonus separated)
- Bonus eligibility badge on Deposit button

### Marketing Assets ✅
- 15 pre-built social slideshows at `/slides`:
  - "$847 playing Geoguessr for money"
  - "Made $500 in 3 weeks"
  - "$20 to $400 skill progression"
  - Portuguese variants for Brazil market
  - Screenshot-ready for TikTok/Reels/Shorts

---

## Next Steps

### Immediate (This Week)
1. **Wire profile page to real data** - Currently using dummy data, connect to Supabase queries
2. **Test deposit → play → withdraw flow** - End-to-end financial validation
3. **Record 3-5 gameplay sessions** - Need content for social launch
4. **Soft launch to friends** - Get 5-10 real users, watch for bugs

### Marketing Prep (Week 2)
1. **Create 10 TikTok/Reels from recorded gameplay**
   - Hook: "I turned my GeoGuessr skill into $X"
   - Show actual gameplay + earnings
   - CTA: "Link in bio to play for money"
2. **Post in r/geoguessr** (carefully)
   - Start with comment replies offering 1v1 matches
   - Test mod tolerance before posting standalone
3. **DM GeoGuessr YouTubers/streamers**
   - Offer free $50 balance to try it on stream
   - Affiliate cut if they promote

### Scale (Week 3-4)
- If TikTok works → post 3x daily, reply to all comments
- If Reddit works → expand to r/competitivegaming, r/skillgaming
- If streamers work → offer sponsored tournaments
- If friends work → referral bonus (both sides get $10 on first deposit)

---

## What We're NOT Doing

| Distraction | Why Not |
|------------|---------|
| Challenge links | Async matching works fine for now |
| Live multiplayer | Seed-based is simpler and prevents cheating |
| Multiple games | Validate one game first |
| Mobile app | Progressive web app is sufficient |
| Complex tournaments | Run manually if needed |
| ELO/ranking | Score bands + leaderboard is enough |
| Chat/social features | Premature without users |
| Paid ads | Need organic proof first |
| Press outreach | No journalist covers 0-user platforms |
| Admin dashboard | Supabase UI works for now |

---

## Success Criteria (30 Days)

| Metric | Pass | Fail |
|--------|------|------|
| Registered accounts | 50+ | <20 |
| Depositing users | 10+ | <3 |
| Total deposits | $500+ | <$100 |
| Organic matches (no friends) | Happening | Not happening |
| TikTok total views | 10k+ | <1k |
| Profile visit rate | 30%+ | <10% |

If **pass**: Double down on what worked. Increase content output. Run first tournament.

If **fail**: Diagnose why. Is it the game (people try it and don't like it)? The onboarding (people sign up but don't play)? The trust (people don't deposit)? Fix the bottleneck before spending more.

---

## Learnings to Apply to Hard2Kill

- Async matching > real-time servers (simpler, cheaper, more reliable)
- Bonus balance system essential from day 1
- Social proof (leaderboard, latest wins) drives trust
- Pre-built marketing assets (slides) enable fast content creation
- Profile page drives retention (people check their stats constantly)
- Score bands prevent skill mismatch frustration
