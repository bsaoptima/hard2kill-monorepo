# Geostakes Build Log

> Running document of decisions, learnings, and implementation details for the Geostakes platform.

## Platform Overview

**What:** GeoGuessr-style 1v1 wagering platform
**Tech Stack:** Next.js (App Router) + Supabase + Stripe
**URL:** TBD (pending domain)
**Status:** Core product complete, entering pre-launch testing

---

## Core Mechanics

### Game Flow
1. User selects stake ($1, $5, or $10)
2. System creates match with async seed-based pairing
3. 5 rounds, each with:
   - Random street view location
   - 60-second timer (server-authoritative)
   - User submits guess on map
   - Distance calculated, closer guess wins round
4. Winner takes pot minus 10% house rake
5. Payouts go to cash balance, withdrawable immediately

### Why Async Matching?
- No need for real-time servers (cheaper, simpler)
- No waiting for opponent to be online
- Prevents real-time cheating (coordinated throwing)
- Players can compete against anyone who played the same seed

### Why 25-Second Timer?
Originally 60s, changed to 25s to prevent:
- Google image reverse search
- Extensive street sign Googling
- Alt-tab research
Forces reliance on actual GeoGuessr knowledge/intuition.

### Score Band Matching
Prevents superhuman scores from matching with casuals:
- Band 1: 0-15,000 points (casual)
- Band 2: 15,001-20,000 points (intermediate)
- Band 3: 20,001-25,000 points (expert)

Players only match with others in their score range. Prevents frustration and likely cheating detection.

---

## Financial System

### Bonus Balance Design
**Problem:** Free money attracts bot farmers who withdraw without playing.
**Solution:** Separate `bonus_balance` column with restrictions:
- First deposit: 100% match goes to bonus balance
- Bonus funds used first when placing bets
- Bonus winnings convert to cash balance (withdrawable)
- Prevents direct withdrawal of bonus funds

This allows promotional offers (deposit bonuses, referral rewards) without abuse risk.

### Rake Structure
- 10% on winning pots
- 0% on forfeits (full pot to winner)
- Example: $10 bet × 2 players = $20 pot → winner gets $18, house gets $2

### Withdrawal Types
- Bank transfer (ACH)
- Debit card
- Stablecoin (USDC)

---

## UI/UX Decisions

### Glass-Card Aesthetic
Dark theme with frosted glass cards. Creates premium feel, differentiates from cheap-looking gambling sites. Applied globally via CSS class.

### Latest Wins Leaderboard
Shows recent match results on homepage:
- Player names
- Stake amount
- Pot size
- Time ago

**Why:** Social proof. Shows real people winning real money. Drives trust.

### Profile Page
- Total balance (cash + bonus)
- Win rate %
- Total matches played
- Profit/loss calculation
- Recent match history (last 15)
- Leaderboard position (top 10 shown, current user highlighted)

**Why:** Stat checking is addictive. Players return just to see their rank. Increases session frequency.

### Live Match Grid
12 animated tiles on homepage showing active games (street view images cycling). Creates sense of activity, FOMO.

---

## Marketing Assets Built

### Social Slideshows (`/slides`)
15 pre-built stories for TikTok/Reels/Shorts:
1. "$847 playing Geoguessr for money"
2. "Made $500 in 3 weeks"
3. "Turned Geoguessr into income"
4. "Geoguessr rank = money"
5. "Geoguessr wagering in Brazil" (Portuguese)
6. "$20 to $400" progression
7. "$500/month" story
8. Multiple variants of earning stories

**How to use:**
- Screen record slideshow on phone
- Add voiceover
- Post as Reel/Short/TikTok
- CTA: "Link in bio"

**Why pre-build:** Removes creative friction. Can batch-create 10 videos in one sitting.

---

## Technical Decisions

### Why Next.js App Router?
- Server components reduce client JS
- Built-in API routes
- Good Supabase integration
- Familiar stack

### Why Supabase?
- Postgres + Auth + Realtime in one
- Row-level security
- Free tier sufficient for MVP
- Easy admin queries

### Why Stripe?
- Industry standard for payments
- Handles compliance (PCI, KYC if needed later)
- Webhook support for deposit confirmation
- Connect for future marketplace model

### Database Schema Highlights
- `geostakes_matches` — Match records (players, stakes, status)
- `geostakes_match_locations` — 5 rounds per match
- `geostakes_round_guesses` — Player submissions with scoring
- `balances` — User funds (cash, bonus, coins)
- `geostakes_bonus_claims` — Tracks first deposit bonus eligibility
- `game_history` — Completed games log for analytics

### Anti-Cheat Measures
1. **Server-authoritative timer:** Client can't manipulate countdown
2. **25-second limit:** Not enough time to reverse image search
3. **Score band matching:** Suspiciously perfect scores only match each other
4. **Seed-based matching:** Can't coordinate throwing with friend

---

## Open Questions

1. **Minimum deposit amount?** $5? $10? Lower = more signups, higher = fewer support issues.
2. **Rake on ties?** Currently refunds both players. Alternative: house takes 10% of pot, split rest.
3. **Leaderboard prizes?** Monthly $100 to top player? Drives competition but costs money.
4. **Challenge links?** Allow direct 1v1 vs. specific opponent? Adds viral potential but complexity.
5. **Mobile app?** PWA works but native app might convert better.

---

## Blockers / Not Yet Built

- [ ] Profile page wired to real Supabase data (currently dummy data)
- [ ] End-to-end payment testing (deposit → play → withdraw)
- [ ] Email notifications (match complete, withdrawal processed)
- [ ] Affiliate system (referral links, tracking, payouts)
- [ ] Admin panel (user lookup, manual adjustments, fraud detection)
- [ ] Analytics dashboard (DAU, deposit rate, rake collected)

---

## Next Milestones

1. **Week 1:** Wire profile to real data, test full payment flow, soft launch to 5-10 friends
2. **Week 2:** Record gameplay, create 10 TikTok/Reels, post in r/geoguessr comments
3. **Week 3:** DM GeoGuessr streamers, offer $50 free balance to try on stream
4. **Week 4:** Analyze what worked, double down on best channel

---

## Lessons for Hard2Kill

1. **Async > Real-time:** Seed-based matching is simpler, cheaper, more reliable than Colyseus rooms
2. **Bonus system from day 1:** Can't run promos safely without it
3. **Social proof everywhere:** Latest wins, leaderboards, live match grids
4. **Pre-built marketing assets:** Slideshows remove creative friction
5. **Profile page = retention:** Stat checking is addictive
6. **Score bands prevent frustration:** Skill mismatches kill retention
