# CURRENT FOCUS

> Last updated: April 14, 2026

## The Goal
Get to 20+ DAU at peak hours within 30 days with $5,000.

---

## PHASE 1: BUILD (Week 1) — $0 spent

Three code changes. Nothing else. Don't touch marketing until these are done.

### 1. Challenge Links
The single most important feature. Everything downstream depends on it:
- Tournaments need it (clean matchmaking between two specific players)
- Bounty challenges need it (DM someone a link to play you)
- Viral sharing needs it (challenge a friend after a win)
- Without it, tournaments are janky, bounties require voice chat coordination, and there's no viral loop

### 2. Bonus Balance System
You got burned by T-001 (free cash → bot farming → real payouts). Every tactic in the $5K plan involves giving someone free money. None of them are safe until this is built:
- New `bonus_balance` column in `balances` table
- Bonus funds require 3x wagering before withdrawal
- OR: bonus winnings only unlock after a real deposit
- `deductBalance` uses bonus first, tracks wagering progress
- This protects you on: first-deposit bonuses, referral rewards, bounty match funding, affiliate preloads

### 3. Remove Bot Cash Limit
`MatchmakingRoom.ts` line 16: `MAX_BOT_GAMES = 3` → `999`. Five-second change. Stops existing players from hitting a dead end.

**Nothing else in week 1.** Don't build tournaments, rankings, new games, cosmetics, or anything that isn't these three things.

---

## PHASE 2: SEED (Week 2-3) — $2,250 spent

Challenge links and bonus system are live. Now deploy capital.

### Step 1: Join 15-20 wager Discord servers ($0)
Browse DISBOARD, Discord.me, Discadia. Tags: `wagers`, `1v1`, `fortnite-wagers`, `cod-wagers`. Prioritize 500-5,000 member servers. Full directory in `knowledge/WAGER_DISCORD_SERVERS.md`.

### Step 2: DM 10 server admins/middlemen ($500)
The business proposition:
- $250 sponsored tournament for their server
- $50 free balance for them to try the platform
- Affiliate code: 20% of deposits from their referrals
- You're giving, not asking. They look good, their server gets a free event, they earn passive income.

Fund 10 admin/middleman accounts at $50 each = $500. These people have the trust you can't build in days.

### Step 3: Run first tournament ($250)
With the first admin who says yes. 8-player bracket, coin matches, challenge links for each round. Prizes paid manually after verification (1st $125, 2nd $60, 3rd $40, 4th $25). Full flow in `product/TOURNAMENT_DESIGN.md`.

### Step 4: Post bounty challenges ($500)
In servers where admins didn't respond: post in #looking-for-match channels. "Anyone want to 1v1 me for $25? DM me." Send challenge links. Play 20 bounty matches across 2 weeks. You might win some back.

### Step 5: Recruit 5 prop players ($1,000)
From tournament participants and bounty opponents — pick the 5 most active. $15/hr, 2 hours/night (8-10 PM EST), 5 nights/week for 2 weeks. They keep all winnings on top. Your lobbies are never empty at peak.

---

## PHASE 3: CONTENT (Week 2-4, parallel) — $0 spent

Start the day you run your first bounty match. Doesn't require budget, just time.

### Record everything
Every bounty match, every tournament round, your own practice sessions. Screen record it all.

### Edit into clips
3 per day across TikTok + YouTube Shorts + Instagram Reels:
- "Starting with $5, let's see how far I get" (session journey)
- "I challenged a Discord wager player to $25 on my platform" (challenge format)
- Tournament highlights: "8 players, $250 on the line, here's what happened"
- Close calls, clutch wins, rage moments

### Rules
- Never say gambling/betting/wager on TikTok. Say "money match", "cash match"
- Batch-record: 1-2 hours of gameplay = 1 week of clips
- Reply to every comment in the first hour after posting

---

## PHASE 4: SCALE WHAT WORKS (Week 4) — $2,250 remaining

Look at the numbers:
- Which channel brought the most signups? (Discord DMs, tournaments, bounties, TikTok, personal network)
- Which players deposited real money?
- Are prop player hours still needed or are organic players filling peak?
- Did any admin become an active affiliate?

Then:
- If tournaments worked → run 3-4 more in different servers ($750-1,000)
- If bounties worked → do 20 more ($500)
- If a specific streamer/admin is sending players → increase their incentive
- If prop players are still needed → extend another week ($750)
- If organic matches are happening at peak → cut prop players, redirect budget to tournaments

---

## BUDGET SUMMARY

| Phase | Allocation | When |
|-------|-----------|------|
| Phase 1: Build | $0 | Week 1 |
| Phase 2: Admin/middleman balances | $500 | Week 2 |
| Phase 2: First tournament | $250 | Week 2-3 |
| Phase 2: Bounty matches | $500 | Week 2-3 |
| Phase 2: Prop players | $1,000 | Week 2-3 |
| Phase 4: Scale what works | $2,250 | Week 4 |
| **Unallocated buffer** | **$500** | Reserve |
| **Total** | **$5,000** | |

---

## WHAT I'M NOT DOING (And Why)

| Distraction | Why Not |
|------------|---------|
| Building new games | Need players for existing games first |
| Ranking/ELO system | Meaningless with <50 players |
| Admin dashboard | You can query Supabase directly |
| Mobile app | Web works fine for now |
| Paid ads | Sending traffic to empty lobbies = waste |
| SEO content | Takes 6-12 months to rank. Start writing but don't depend on it. |
| Affiliate dashboard | Track in a spreadsheet. Build when you have 10+ affiliates. |
| Reddit | Gets you banned |
| Press outreach | No journalist covers 0-user platforms |
| Cosmetics/skins | Retention feature. Useless without users to retain. |
| Tournament system in code | Run manually via Discord + Challonge + challenge links. Build infra later. |

---

## SUCCESS CRITERIA (30-Day Check)

| Metric | Pass | Fail |
|--------|------|------|
| Registered accounts | 100+ | <50 |
| DAU at peak hour | 15-20 | <10 |
| Depositing users | 15+ | <5 |
| Organic PvP matches (no prop players) | Happening | Not happening |
| TikTok total views | 25k+ | <5k |
| Active affiliate admins | 2-3 | 0 |

If **pass**: extend budget, hire more prop players, run bigger tournaments, start micro-influencer outreach on Kick.

If **fail**: diagnose why. Is it the game (people try it and don't like it)? The onboarding (people sign up but don't play)? The trust (people don't deposit)? Fix the bottleneck before spending more.
