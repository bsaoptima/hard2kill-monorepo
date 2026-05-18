# Discord Tournament Design

> How to run a $250 sponsored tournament without repeating the free cash balance exploit.

---

## The Core Rule

**Prize money never touches a player's balance until they've beaten a real human in the final bracket AND you've manually verified it.** No free balance. No house-funded pots. No bonus credits. Players play coin matches. Winners get paid manually after the tournament.

---

## Why This Is Different From the T-001 Exploit

| T-001 (Failed) | Tournament (Safe) |
|----------------|-------------------|
| Free $10 cash dropped into `balance` | No cash touches any account until after tournament |
| Players played bots with free cash | Players play coin matches against real humans |
| Winnings from bot matches = real withdrawable cash | Coin winnings = non-withdrawable |
| No cap on how much they could extract | Prize pool is fixed ($250), paid only to verified winners |
| Automated — system paid out automatically | Manual — you verify results and pay yourself |

---

## The Full Flow (No Code Changes Needed)

This runs entirely on Discord + your existing coin match system + manual payouts.

### Phase 1: Announcement (Discord)

Server admin posts (or you post with admin's permission):

```
🏆 $250 FREE TOURNAMENT — Hard2Kill GladiatorZ 🏆

💰 Prizes:
   1st: $125
   2nd: $60
   3rd: $40
   4th: $25

📋 Rules:
   - 8 players, single elimination bracket
   - 1v1 GladiatorZ matches
   - FREE entry — no deposit needed
   - React ⚔️ to sign up (first 8 get in)
   - Tournament starts [DATE] at [TIME] EST

All you need is a Hard2Kill account (free).
Sign up: [link to hard2kill]
```

### Phase 2: Registration (Discord DMs)

Once 8 players react:

1. DM each player:
```
You're in the tournament! Here's what you need:
1. Create an account at [hard2kill link] if you don't have one
2. Reply with your Hard2Kill username
3. Be online at [TIME] on [DATE]

You'll play coin matches (no real money during games). 
Winners get cash prizes paid out after the finals.
```

2. Collect all 8 usernames
3. Create the bracket on **challonge.com** (free tool — challonge.com/tournament/new, single elimination, 8 players, randomize seeds)
4. Post the bracket image in Discord

### Phase 3: Match Play

**For each round (Quarterfinals → Semis → Finals):**

1. Announce the matchup in Discord:
```
QUARTERFINAL 1: @Player_A vs @Player_B

Both of you:
1. Go to Hard2Kill
2. Both click "Find Match" for a $1 COIN game at the same time
3. When I say GO in voice chat — both queue up
4. Play the match
5. Winner posts screenshot of result here

Ready? Join voice channel "Tournament Lobby"
```

2. **Coordination:** Both players join a Discord voice channel. You count down "3, 2, 1, GO" and they both click matchmaking simultaneously. Since they're the only two queuing for $1 coin at that exact moment, they match each other.

3. **Verification:** Winner posts screenshot in Discord. You can also verify in your `game_history` table in Supabase if needed.

4. **If they don't match each other** (someone else was queuing): Both leave, wait 30 seconds, try again. Pick an unusual bet amount like $1 coin to reduce collision risk. OR — use a higher coin amount like $3 or $7 that nobody else would be queuing for.

5. Update the bracket on Challonge after each match.

**Round timing:**
- Quarterfinals (4 matches): Run 2 at a time. ~20 minutes.
- Semifinals (2 matches): ~10 minutes.
- 3rd place match + Final: ~15 minutes.
- **Total tournament time: ~45-60 minutes.**

### Phase 4: Payout (Manual — This Is the Safety Net)

After the final match:

1. Verify results: check `game_history` table in Supabase to confirm all match results
2. Pay winners via one of these methods:

**Option A: Credit their Hard2Kill balance (simplest)**
```sql
-- Run in Supabase SQL editor or via supabaseAdmin
UPDATE balances SET balance = balance + 125 WHERE id = '[winner_user_id]';
UPDATE balances SET balance = balance + 60 WHERE id = '[2nd_place_user_id]';
UPDATE balances SET balance = balance + 40 WHERE id = '[3rd_place_user_id]';
UPDATE balances SET balance = balance + 25 WHERE id = '[4th_place_user_id]';
```

This is safe because:
- The money goes directly to their `balance` (cash) — yes, it's withdrawable
- But they EARNED it by beating real humans in a verified bracket
- You manually verified each result before crediting
- The total payout is exactly $250 — no more, no less
- They can't "farm" this because tournaments are scheduled events you control

**Option B: Pay via PayPal/CashApp/Venmo**
- Ask winners for their payment info in DM
- Send money directly
- This completely bypasses your platform's balance system
- Upside: zero exploit risk
- Downside: more friction, some players may not have PayPal

**Recommended: Option A** for winners who want to keep playing on the platform (their winnings become their bankroll). Option B if they ask for it.

### Phase 5: Post-Tournament Content

- Screenshot the final bracket and post in Discord
- Post the winner announcement:
```
🏆 TOURNAMENT RESULTS 🏆

1st: @Winner — $125 💰
2nd: @RunnerUp — $60
3rd: @ThirdPlace — $40
4th: @FourthPlace — $25

GG to all players! Next tournament: [DATE]

Want to play for money anytime? → [hard2kill link]
```
- Edit your best match clips into TikTok/Shorts content
- Winners will likely post about their win → free marketing

---

## What Can Go Wrong (And How To Handle It)

### "Players don't match each other in queue"
**Problem:** Two tournament players queue at the same time but someone else is also queuing and one of them matches the wrong person.
**Fix:** Use an unusual coin bet amount that nobody else would queue for. $3 or $7 coins instead of $1 or $5. Or coordinate tightly via voice chat countdown.
**Better fix (requires code):** Build challenge links so two specific players can directly match. This is worth building anyway — it's your #1 growth mechanic.

### "A player no-shows"
**Problem:** Player signed up but isn't online when their match starts.
**Fix:** 5-minute grace period. If they don't show, opponent advances automatically (walkover/bye). Announce this rule upfront.

### "A player disconnects mid-match"
**Problem:** Internet drops, game crashes, browser closes.
**Fix:** The player who disconnects forfeits. Your game already handles this — when a player leaves `GameRoom`, `onLeave` fires, and if only one player remains, they win. The game state resolves naturally.

### "Players try to collude"
**Problem:** Two friends enter, one throws matches to help the other win more prize money.
**Fix:** At 8 players and $250, this isn't worth worrying about. The prizes are small enough that collusion doesn't scale. If it becomes a pattern in future tournaments, use random seeding and track suspicious results.

### "Someone creates multiple accounts to fill spots"
**Problem:** One person registers 3 accounts, plays against themselves, guarantees at least some prize money.
**Fix:** Require Discord accounts with some history (not brand new). Require voice chat during matches (hard to be on two voice channels simultaneously). Check game_history for suspicious patterns (same IP, identical timing).

### "Winner takes the prize money and immediately withdraws, never plays again"
**Problem:** You paid $125 and got a user who churns.
**Fix:** This isn't a problem — it's a $125 marketing cost for a real user who experienced your platform. Some will churn. Some will deposit and keep playing. That's the funnel. At $250 per tournament for 8 users, your CAC is $31/user. If even 2 of them become depositing players, you're way under the industry CAC of $200-500.

### "The tournament feels janky because matching is manual"
**Problem:** Counting down in voice chat and hoping both players queue at the same time feels amateur.
**Fix (short term):** Own it. "We're a scrappy startup, this is our first tournament, bear with us." The Discord wager community is used to manual processes — they already use middlemen and PayPal. This isn't worse than what they're used to.
**Fix (long term):** Build challenge links. Then tournament flow becomes: generate challenge link for each match → send to both players → they click and play. Clean.

---

## With Challenge Links (After You Build Them)

The flow gets much cleaner:

1. Both players registered → you know their user IDs
2. You generate a challenge link: `hard2kill.gg/c/[id]` pre-set to a coin match
3. Both players click the link → they're placed in a game room together → match starts
4. Result is recorded automatically in `game_history`
5. You check results, advance bracket, generate next round's links
6. Pay winners manually after finals

**No voice chat coordination needed. No queuing timing. No wrong-opponent risk.** This is why challenge links should be built before the first tournament if possible.

---

## Cost Per Tournament

| Item | Cost |
|------|------|
| Prize pool | $250 |
| Your time (~2 hours) | $0 (you're the founder) |
| Challonge bracket | $0 (free tool) |
| **Total** | **$250** |

**Unit economics:**
- 8 players sign up → 8 accounts created
- ~3-4 will likely play again after the tournament
- ~1-2 will eventually deposit real money
- CAC per depositing user: $125-250 (right at industry average, but these are high-quality users)
- If you run this in a server with 2,000+ members, you might get 16-32 signups (8 play, rest create accounts to watch or wait for next one)

---

## Scaling: From 1 Tournament to 5

| Tournament # | Server | What You Learn |
|-------------|--------|---------------|
| 1 | Your best admin partnership | Does the format work? How long does it take? Do players enjoy it? |
| 2 | Same server, different week | Do players come back? Do new ones sign up? |
| 3 | Different server | Does it work in a different community? |
| 4-5 | Servers that showed most interest | Double down on what's working |

**Don't run 5 simultaneously.** Run one per week. Learn from each one. Fix what's broken. Iterate.

---

## Checklist Before First Tournament

- [ ] Challenge links built (strongly recommended) — OR confirm the "queue at the same time" method works reliably with coin matches
- [ ] Pick a coin bet amount for tournament matches that won't collide with other players ($3 or $7)
- [ ] Test the full flow with a friend: both queue, match, play, result shows in game_history
- [ ] Set up Challonge account and create test bracket
- [ ] Have Supabase admin panel open for manual balance credits (or PayPal ready)
- [ ] Partner with at least one Discord server admin who's agreed to announce it
- [ ] Prepare the announcement message and rules
- [ ] Block 2 hours on your calendar for tournament night
- [ ] Have a backup plan if a player no-shows (alternate/substitute player on standby)
