# Cold Start Plan: Getting the First 500 Active Players

> The #1 reason PvP platforms die is empty lobbies. Every feature, every marketing dollar, every hour of work should serve one goal until you hit critical mass: **make sure anyone who shows up can play a match within 10 seconds.**

---

## THE CURRENT PROBLEM (Audit of Existing Code)

| What exists | What's broken about it |
|-------------|----------------------|
| Bot backfill in GladiatorZ (2s spawn) | 3-game cash limit means your best players hit a wall fast |
| No bots for Wasteland | Half your games have ZERO cold-start protection |
| Login required to play anything | A visitor who just wants to try it bounces immediately |
| Fake player count (hardcoded 0-10) | Savvy users will notice. Unsavvy users see "4 players online" and think it's dead. |
| No challenge/invite links | The most natural PvP viral loop doesn't exist |
| No first-deposit bonus | Zero incentive to go from coins to cash |
| No referral system | Your existing players can't bring friends for mutual benefit |
| 10 coins/hour claim | Good, but new user starts at 0 coins — must claim, then wait for queue, then maybe play |
| Matchmaking shows queue position | Seeing "Position: 1" with nobody else is demoralizing |

---

## PHASE 1: MAKE THE PLATFORM FEEL ALIVE (Week 1-2)

These changes require no marketing spend. They just make the product not scare people away.

### 1.1 Remove the 3-Game Bot Cash Limit

**Why:** You have zero players. A person who deposits $5 and can only play 3 bot matches before staring at an empty queue will never come back. The limit exists to prevent abuse of "easy" bot wins, but that's a scale problem, not a cold-start problem. Add it back when you have 100+ DAU.

**Where in code:**
- `server/src/rooms/MatchmakingRoom.ts` line 16: `MAX_BOT_GAMES = 3`
- `server/src/rooms/WastelandMatchmakingRoom.ts` has the same constant
- Comment it out or set to 999. One line change.

**Risk:** Someone could farm bots for easy money. Mitigation: bots should win ~40-50% of the time against average players (adjust bot AI). The house isn't losing money if the bot takes the pot half the time.

### 1.2 Build Wasteland Bots

**Why:** Wasteland has NO bot backfill. A player who picks the 3D FPS will sit in an empty queue forever. That's a dead product.

**Where in code:**
- `server/src/rooms/WastelandGameRoom.ts` — needs bot spawning logic mirroring GladiatorZ's `GameRoom.ts` lines 93-114
- Create `server/src/bots/WastelandBot.ts` — simpler than GladiatorZ since Wasteland is 3D FPS. Bot needs: random movement, occasional shooting toward player, ~35% accuracy, periodic health pack seeking
- Wire bot spawning into `WastelandGameRoom.onJoin` with same 2-second delay pattern

**Scope:** This is probably 2-3 days of work. It's the single highest-impact feature you can build right now because Wasteland is currently unplayable solo.

### 1.3 Fix the Player Count Display

**Why:** Showing "4 players online" (fake, hardcoded at 0-10 range) is worse than showing nothing. A real gamer sees "4 online" on a PvP platform and reads it as "this is dead."

**What to do:**
- **Option A (quick):** Remove the player count entirely. Replace with "100+ matches played today" and track actual total matches from `game_history`. A cumulative number only goes up, never looks dead.
- **Option B (better):** Show real matchmaking queue count + bot matches. "5 matches happening right now" where most are bot matches. This is honest-ish and always shows activity.
- **Option C (best):** Replace with social proof that doesn't depend on concurrent users. Show a scrolling feed: "SwiftHunter7821 just won $5 in GladiatorZ" — mix of real wins and bot-match wins. This is what Stake.com does with their live bet feed.

**Where in code:**
- `Landing.tsx` lines 40, 145-165 — the fake count logic
- `Landing.tsx` lines 677-678, 927-929 — the display

### 1.4 Give New Users Coins Immediately

**Why:** Right now a new user signs up with 0 coins, 0 cash. They have to manually click "CLAIM 10 COINS" before they can do anything. Every click is friction. Every friction point kills conversion.

**What to do:**
- On account creation (`App.tsx` lines 30-45 where balance is created), auto-grant 50 coins. Not 10 — 50. That's 5 matches worth at $10 bet or 10 at $5.
- Remove the claim button for first-time users. Replace with: "You have 50 free coins! Play your first match now →"
- Keep the hourly claim for subsequent visits.

**Where in code:**
- `App.tsx` lines 30-45 — balance creation on first auth
- `shared/supabase.ts` — the balance insert needs to set `coins: 50` instead of `coins: 0`

---

## PHASE 2: LET PEOPLE PLAY BEFORE THEY COMMIT (Week 2-3)

### 2.1 Guest Play (No Signup Required)

**Why:** Players Lounge found that getting people physically playing was the hardest part. PokerStars launched with play-money first. Your conversion funnel should be: **see the page → play a game → then decide to sign up.** Right now it's: see the page → sign up → claim coins → find match → play. That's 4 steps before the "magic moment."

**What to build:**
- Anonymous/guest session: generate a temp UUID, assign a random username, give 20 coins
- Guest can play coin matches against bots immediately
- After the match, show: "You won! Create an account to keep your coins and play for real money."
- Guest data is stored in localStorage. If they sign up, migrate coins to their real account.
- No Supabase auth needed for guest play — just a temp session on the Colyseus side.

**Where in code:**
- `Landing.tsx` line 245: `if (!userId) { showAuth('Login to play'); }` — change this to create guest session
- `MatchmakingRoom.ts` `onJoin` — accept guest sessions for coin-only matches
- `GameRoom.ts` — needs to handle guest player IDs

**Benchmark:** The free-to-play industry sees ~5% of free players convert to paying. But those 5% are very high-LTV. If 1,000 guests play, 50 sign up, 10 deposit, that's 10 depositing users from 1,000 visitors. At $5 first-deposit bonus, that's $50 CAC for 10 users = $5/depositor.

### 2.2 Instant Play Button on Landing Page

**Why:** The current landing page shows game cards with bet amounts ($1, $5, $10) which ALL require login. A new visitor sees dollar amounts before they even know what the game is. That's intimidating for a first visit.

**What to do:**
- Add a prominent "PLAY FREE" button above the bet buttons on each game card
- This triggers the guest flow (2.1) — instant coin match against a bot
- Move the cash bet buttons to a secondary position: "Ready for real money? →"
- The first thing a visitor should be able to do is **play**, not **pay**

**Where in code:**
- `Landing.tsx` game card sections (~lines 868-982)
- Add a new button before the bet amount selector
- Wire it to guest matchmaking → bot match

---

## PHASE 3: THE VIRAL LOOP — CHALLENGE LINKS (Week 3-4)

This is the single most important growth mechanism for a PvP betting platform. Every player is a potential recruiter.

### 3.1 Challenge Link System

**How it works:**
1. After winning a match, player sees: "Challenge a friend for $5?" + share button
2. Generates link: `hard2kill.gg/c/[challengeID]`
3. Friend clicks link, sees: "[PlayerName] challenged you to a $5 GladiatorZ match. Accept?"
4. If friend doesn't have an account: quick signup → auto-funded with $5 free (their first match is on you)
5. Both players must be online to play. The challenger gets a push/notification when the friend accepts.
6. This solves cold start because the match is pre-arranged — no empty queue.

**What to build:**

**Database:**
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID REFERENCES auth.users(id),
  challenger_name TEXT,
  game TEXT NOT NULL,        -- 'gladiatorz' or 'wasteland'
  bet_amount INTEGER NOT NULL,
  currency TEXT NOT NULL,     -- 'cash' or 'coins'
  status TEXT DEFAULT 'pending', -- pending, accepted, expired, completed
  opponent_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '48 hours',
  room_id TEXT                -- Colyseus room ID when match starts
);
```

**API endpoints:**
- `POST /api/challenge/create` → returns challenge ID + shareable URL
- `GET /api/challenge/:id` → returns challenge details (for the landing page when friend clicks link)
- `POST /api/challenge/:id/accept` → opponent accepts, both get notified, room created
- Challenges expire after 48 hours

**Frontend:**
- Challenge creation modal after match win
- Share via: copy link, WhatsApp, Twitter/X, iMessage (use Web Share API on mobile)
- Challenge landing page: shows challenger name, game, bet, "Accept Challenge" CTA
- Real-time notification when opponent accepts (Colyseus message or polling)

**Why this is the #1 priority growth feature:**
- Players Lounge started by organizing 1v1 matches between friends at bars. The personal challenge IS the product.
- Every challenge sent is a free marketing impression to someone who trusts the sender
- The friend's first match is pre-funded by you ($5) — that's a $5 CAC, 40-100x cheaper than iGaming industry average
- The challenger is invested in getting their friend to play, so they'll follow up ("did you accept my challenge?")

### 3.2 "Share Your Win" After Every Match

**Why:** Right now there's a basic Twitter/clipboard share (`Landing.tsx` lines 2631-2646) but it's not tied to any incentive and generates a generic text.

**What to improve:**
- Auto-generate a visual card (canvas or server-rendered image): player name, opponent name, match result, earnings, game screenshot
- Share to: Twitter/X, Instagram Story, TikTok (download video clip), WhatsApp, copy link
- Include a referral link in the share: "Think you can beat me? → hard2kill.gg/r/[username]"
- Give 5 bonus coins for every share (tracked via share event, not hard to game but incentivizes the behavior)

---

## PHASE 4: SCHEDULED EVENTS — CONCENTRATE PLAYERS (Week 4-5)

### 4.1 Daily "Arena Hour"

**Why:** With <100 DAU, you cannot fill lobbies 24/7. Every small poker room knows this — they run scheduled tournaments, not open tables. Concentrate your players into windows where they'll actually find opponents.

**What to build:**
- Pick 2 time slots: **8 PM EST weekdays**, **3 PM EST weekends**
- During Arena Hour (1 hour window):
  - 2x coin earnings on all matches
  - One free cash match ($5, funded by you) for anyone who shows up
  - Countdown timer on landing page: "Arena Hour starts in 2h 14m"
- Push notification / email 30 min before: "Arena Hour starts soon. 12 players signed up."
- Discord ping with the same message

**Implementation:**
- Server-side: flag in config for active event windows, check timestamps on match start
- Landing page: countdown component, event banner
- Supabase: track Arena Hour participation for analytics
- Simple cron or timestamp check — no complex scheduling needed

### 4.2 Weekly Freeroll Tournament

**Why:** This is THE proven tactic from online poker. PokerStars freerolls filled up within seconds. Forums existed just to track when freerolls went live. People get addicted to free tournaments because the downside is zero and the upside is real money.

**What to build:**
- Every Friday at 8 PM EST: "Friday Freeroll"
- Free entry, 8-player bracket (or 16 if you have the numbers)
- Prize pool: $25 cash (funded by you)
- 1st: $15, 2nd: $7, 3rd: $3
- Requires account (not guest) — this converts guests to registered users
- Announce on Discord, email list, landing page banner all week
- **Cost: $100/month** for weekly freerolls. That's potentially 50+ registered users per month if each freeroll attracts 8-16 players.

**Implementation:**
- New room type: `TournamentRoom` — bracket of sequential 1v1 matches
- Tournament lobby UI: show registered players, bracket, countdown to start
- This is a bigger engineering lift but it creates a recurring event people put on their calendar

---

## PHASE 5: FIRST-DEPOSIT CONVERSION (Week 5-6)

### 5.1 First-Deposit Match Bonus

**Why:** No one deposits into an unknown platform without an incentive. Every sportsbook, casino, and betting platform offers a first-deposit bonus. You currently offer nothing.

**What to build:**
- "Deposit $5, get $5 free" — 100% match, capped at $10
- Bonus credits are separate from cash balance (new field: `bonus_balance` in `balances` table)
- 2x wagering requirement before withdrawal: must wager 2x the bonus amount ($10 total) before bonus converts to withdrawable cash
- Show prominently on landing page: "YOUR FIRST MATCH IS ON US"
- Stripe webhook (`server/src/index.ts` lines 53-70): detect first deposit, credit bonus

**Where in code:**
- `balances` table: add `bonus_balance` column, `first_deposit_bonus_claimed` boolean
- `server/src/index.ts` Stripe webhook handler: check if first deposit, add bonus
- `shared/supabase.ts`: modify `deductBalance` to use bonus balance first, track wagering progress
- Landing page: banner for the offer

**Unit economics:**
- You pay $5-10 per first depositor
- If that player plays 10+ matches, your rake (pot mechanics) recovers the bonus
- iGaming industry pays $200-500 per depositor. You'd be at $5-10.

### 5.2 The Coin → Cash Nudge

**Why:** You have 10 coins/hour and a coin-play system. But there's no nudge to convert coin players to cash players. The bridge is missing.

**What to build:**
- After 3 consecutive coin wins, show modal: "You're on fire! 🔥 Ready to play for real money? Your first $5 cash match is free."
- This links to the first-deposit bonus (5.1)
- After 10 total coin matches played, show: "You've played 10 matches. Players who switch to cash earn 47x more. Make your first deposit →"
- Track `coin_matches_played` and `coin_win_streak` in user profile or local state
- These nudges should feel like progression, not spam

---

## PHASE 6: REFERRAL LOOP (Week 6-7)

### 6.1 Give $5, Get $5

**What to build:**
- Every user gets a referral link: `hard2kill.gg/r/[username]`
- When referred user makes first deposit ($5+): 
  - Referrer gets $5 bonus balance
  - Referred gets $5 bonus balance (stacks with first-deposit bonus)
- Cap at 10 referrals per month (prevent abuse)
- Referral dashboard: show link, track clicks/signups/deposits/earnings

**Database:**
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id),
  referred_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'signed_up', -- signed_up, deposited, rewarded
  created_at TIMESTAMP DEFAULT NOW(),
  rewarded_at TIMESTAMP
);
```

**Where to surface:**
- After every win: "Invite a friend and you both get $5 → [copy link]"
- Profile page: referral stats
- Landing page (when logged in): "Share Hard2Kill, earn $5 per friend"

---

## PRIORITY ORDER (What to Build First)

| Priority | Feature | Effort | Impact on Cold Start |
|----------|---------|--------|---------------------|
| **P0** | Remove 3-game bot cash limit | 5 minutes | Stops existing players from hitting a wall |
| **P0** | Auto-grant 50 coins on signup | 30 minutes | New users can play immediately |
| **P1** | Guest play (no signup) | 2-3 days | Lets visitors try before committing |
| **P1** | Wasteland bots | 2-3 days | Makes half your platform playable |
| **P1** | Challenge links | 3-4 days | The #1 viral growth mechanic |
| **P2** | Fix player count (live feed) | 1 day | Stops scaring people away |
| **P2** | First-deposit bonus ($5 match) | 1-2 days | Converts coin players to cash |
| **P2** | Share-your-win visual cards | 1-2 days | Makes every win a marketing moment |
| **P3** | Daily Arena Hour | 1 day | Concentrates players into windows |
| **P3** | Referral system ($5/$5) | 2-3 days | Turns players into recruiters |
| **P3** | Weekly freeroll tournament | 3-5 days | Recurring event that drives signups |
| **P3** | Coin→cash nudge modals | 1 day | Bridges free and paid players |

**Total engineering time for P0+P1:** ~1 week
**Total engineering time for everything:** ~4-5 weeks

---

## HOW MANY PLAYERS YOU NEED (The Math)

For Hard2Kill to feel "alive" with real PvP matches:

- **Minimum viable**: 2 concurrent players in the same game, at the same bet level, at the same time
- **With bots as backfill**: You need ~0 concurrent players (bots fill every match)
- **For organic PvP matches**: ~50 DAU generates ~5-10 concurrent players at peak, enough for instant matchmaking during peak hours
- **For 24/7 matchmaking**: ~500 DAU generates ~30-50 concurrent at any time

**Your milestone targets:**
1. **Week 4**: 20 registered users, 5 DAU (all playing bots, some challenging friends)
2. **Week 8**: 100 registered users, 20 DAU (first organic PvP matches during Arena Hour)
3. **Week 12**: 500 registered users, 50 DAU (reliable PvP at peak, bots fill off-peak)
4. **Month 6**: 2,000 registered, 200 DAU (24/7 matchmaking, scaling marketing spend)

---

## THE COLD START SEQUENCE (Step by Step)

1. **You** play the game every day during Arena Hour. Be the first player. Stream it on Kick.
2. **10 friends** — personally message 10 people and get them to sign up and play. Buy them dinner, whatever it takes. This is your atomic network.
3. **Those 10 challenge their friends** via challenge links. If each brings 2, you have 30.
4. **Weekly freeroll** brings in 8-16 strangers from Discord/Reddit/social per week.
5. **Short-form clips** from your own matches + freeroll highlights drive organic discovery.
6. **At 50 DAU**: real PvP matches start happening organically during Arena Hour. Players who experience real PvP matches retain at 3-5x the rate of bot matches.
7. **At 50 DAU**: start spending on micro-influencers and referral bonuses. Not before — you'd be paying to send people to empty lobbies.

---

## WHAT NOT TO DO YET

- **Don't spend money on ads** until you have 50+ DAU. Paid traffic to empty lobbies = burning money.
- **Don't build tournaments** until you can fill an 8-person bracket. Focus on 1v1 first.
- **Don't worry about cheating/abuse** at this scale. A bot farmer who plays 100 matches is better than an empty platform.
- **Don't build a ranking system** until you have enough players for matchmaking to be meaningful. ELO with 20 players is meaningless.
- **Don't optimize retention** before you have acquisition. Retention of 0 users is still 0.

---

## Sources & References

- [Andrew Chen — The Cold Start Problem / Atomic Networks](https://www.sachinrekhi.com/p/andrew-chen-the-cold-start-problem)
- [Players Lounge — Started with bar tournaments, $2.50-$500 wagers, 10% rake (TechCrunch)](https://techcrunch.com/2018/03/19/players-lounge-lets-gamers-make-money-off-their-esports-skills/)
- [PokerStars — Launched with play-money, freerolls, satellite tournaments (Wikipedia)](https://en.wikipedia.org/wiki/PokerStars)
- [PartyPoker — "Shotgun" marketing: 20k→40k concurrent in 4 months (PokerListings)](https://www.pokerlistings.com/news/the-poker-boom-part-2-online-poker-grows-23519)
- [Startup Wagers — 23% conversion to wager, <1% to fund. Failed due to empty marketplace (Failory)](https://www.failory.com/blog/failed-gambling-startup)
- [Online poker rooms used prop players (paid to play) to fill tables (BeastsOfPoker)](https://beastsofpoker.com/online-poker-history/)
- [Free-to-play: 5% of free players convert to paying (Stripe)](https://stripe.com/resources/more/mobile-game-monetization-strategies)
- [iGaming CAC: $200-500 per player, rising (Yogonet)](https://www.yogonet.com/international/news/2026/03/25/118230-igaming-player-acquisition-costs-are-surging-how-operators-are-rethinking-casino-bonus-strategy)
- [Gamedate — HN project to revive dead multiplayer games (HN)](https://news.ycombinator.com/item?id=47096167)
