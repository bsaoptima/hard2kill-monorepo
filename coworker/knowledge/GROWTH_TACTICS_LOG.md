# Growth Tactics Log

> Every tactic we discover or try — what it is, how to implement it, the downsides, and whether it worked. This is a living document. If we tried it, it goes here with the real result.

---

## TACTICS WE'VE TRIED

### T-001: Free Cash Balance on Signup
- **What:** Give new users $10 free cash balance to start playing immediately
- **How:** Credit $10 to `balance` field on account creation
- **Result:** FAILED
- **What happened:** Users played against bots (which are easy to beat), won repeatedly, and accumulated real withdrawable winnings. Stefan had to process real payouts from money that was never deposited. The platform was bleeding cash with no revenue.
- **Root cause:** The free balance was indistinguishable from deposited cash. Bot wins counted as real earnings. No wagering requirement before withdrawal.
- **Fix required before retrying:** Must implement a separate `bonus_balance` system with:
  1. Bonus funds tracked separately from cash deposits
  2. Wagering requirement: user must wager 3-5x the bonus amount before any withdrawal
  3. OR: bonus winnings only become withdrawable after user makes a real deposit of at least the bonus amount
  4. Bot-match winnings from bonus funds should be capped or excluded from withdrawal
- **Industry standard:** Every sportsbook/casino uses this. DraftKings, FanDuel, bet365 all have "bonus bets" that require playthrough. This isn't optional — it's how the entire industry prevents this exact exploit.
- **Status:** Do not retry until bonus balance system is built

---

### T-002: Reddit Self-Promotion
- **What:** Post about Hard2Kill on gaming/betting subreddits
- **How:** Direct posts and comments mentioning the platform
- **Result:** FAILED
- **What happened:** Got banned repeatedly. Reddit mods are extremely hostile to self-promotion. Community described as "very toxic."
- **Downsides:** Time wasted, accounts burned, no signups
- **Possible alternative:** Post a tournament announcement (news, not promo) or a dev-story in r/SideProject. But not worth prioritizing.
- **Status:** Abandoned as primary channel

---

## TACTICS PLANNED (NOT YET TRIED)

### T-003: Discord Server Admin Partnerships
- **What:** Pay wager Discord server admins to run Hard2Kill tournaments in their servers
- **How:** 
  1. Join 15-20 wager Discord servers
  2. DM admins with a deal: $250 tournament sponsorship + $50 free balance for them + affiliate code (20% of deposits from their referrals)
  3. Admin announces tournament to their members
  4. 8-player bracket, free entry, real cash prizes (1st $125, 2nd $60, 3rd $40, 4th $25)
- **Expected cost:** $300 per server (tournament + admin balance)
- **Expected result:** 8-16 signups per tournament, high quality (already wager players)
- **Downsides:**
  - Admins may say no or ghost you
  - Players sign up for the free tournament but never deposit their own money
  - Tournament requires bracket/matchmaking system to be built
  - Players may trash-talk the platform in the server if they have a bad experience (bugs, lag)
  - If payout is slow or glitchy, word spreads fast in Discord communities — reputation damage
- **Mitigations:**
  - Test the full flow yourself before any tournament
  - Have manual payout ready as backup if automated system fails
  - Keep tournament small (8 players) to control the experience
  - Be in the server during the tournament to handle issues in real-time
- **Status:** Planned — requires challenge links + bonus system first

### T-004: Bounty Challenges in Wager Servers
- **What:** Post in wager server channels offering to 1v1 anyone for $25, using Hard2Kill as the platform
- **How:**
  1. Post: "Anyone want to 1v1 me for $25? Automated escrow, no middleman. DM me."
  2. When someone DMs, send them a challenge link with $10 bonus on their account
  3. Play the match. Win or lose, they've experienced the platform.
- **Expected cost:** $25-50 per match (your wager + their bonus). You may win some back.
- **Expected result:** 1-2 new players per bounty match
- **Downsides:**
  - You might get banned if mods consider it promo (framing matters — you're "looking for a match" not "promoting a platform")
  - If you lose every match, it gets expensive fast
  - Players may try it once and never return
  - The $10 bonus exploit (T-001) applies — need bonus system in place
  - Rate limit: Discord flags accounts that DM too many people. Max 10-15 DMs/day.
- **Mitigations:**
  - Frame it as looking for a match, not promoting
  - Only do it in channels specifically for finding opponents (#looking-for-match, #wagers)
  - Bonus must have wagering requirement (see T-001 fix)
- **Status:** Planned

### T-005: Prop Players (Paid Players During Peak Hours)
- **What:** Pay 5 competitive gamers $15/hr to play on Hard2Kill during 8-10 PM EST
- **How:**
  1. Recruit from bounty match opponents or tournament participants
  2. $15/hr, 2 hours/night, they keep all winnings
  3. They play real matches against anyone who shows up
- **Expected cost:** $750/week for 5 players
- **Expected result:** Lobbies are never empty during peak hours
- **Downsides:**
  - Expensive — burns $3,000/month
  - If prop players are too good, new players get destroyed and quit
  - Prop players might collude (trade wins between each other to extract money)
  - Creates dependency — when you stop paying, lobbies may go empty again
  - Need to verify they're actually playing, not just idling
- **Mitigations:**
  - Set skill expectations: prop players should play at "average" level, not tryhard
  - Track their match activity server-side to confirm they're actually playing
  - Use prop players for max 2-3 weeks — cut once organic players fill the gap
  - Stagger their schedules so at least 2 are always on during peak
- **Status:** Planned — after first tournament proves platform works

### T-006: TikTok / Shorts / Reels Content
- **What:** Post 3 short-form videos per day showing money matches on Hard2Kill
- **How:**
  1. Record gameplay sessions (1-2 hours of matches)
  2. Edit into clips in CapCut: "Starting with $5, let's see how far I get" format
  3. Post across TikTok + YouTube Shorts + Instagram Reels
  4. Never say "gambling" or "betting" — say "money match" or "cash match"
- **Expected cost:** $0 (time only)
- **Expected result:** Slow build. 200-500 views per video for first month. Occasional breakout to 5k-50k.
- **Downsides:**
  - Takes 1-2 months to gain any traction
  - TikTok may flag content as gambling-related and suppress it
  - Creating 3 clips/day is a real time commitment (~1-2 hrs/day)
  - Views don't equal signups. Conversion is ~1-2% click, ~10% of those sign up.
  - Account could get banned if TikTok flags it as gambling promotion
- **Mitigations:**
  - Never use words: gambling, betting, wager, casino, odds
  - Use: money match, cash match, play for money, bet on myself, skill match
  - Create a backup TikTok account from day 1
  - Batch-record: one 2-hour session = 1 week of content
- **Status:** Planned — can start immediately, independent of other tactics

### T-007: Kick Streaming
- **What:** Stream Hard2Kill matches on Kick 2-3 times/week, invite viewers to play
- **How:**
  1. Set up Kick channel for Hard2Kill
  2. Stream 1-2 hours: "1v1 me for money — challenge me live"
  3. Interact with chat, explain the platform, play matches on screen
- **Expected cost:** $0 (time only)
- **Expected result:** Slow build. 0-5 viewers initially. Grows with consistency.
- **Downsides:**
  - Kick has low discoverability — new streamers get almost no organic viewers
  - Requires streaming setup (OBS, decent mic, etc.)
  - Time-intensive: 2 hrs streaming + setup/teardown
  - Gambling content on Kick is common — you're competing with Stake/Roobet for attention
- **Mitigations:**
  - Combine with other channels: post TikTok clips that mention "watch me live on Kick"
  - Raid other small streamers to build connections
  - Your unique angle: viewers can actually play AGAINST you for money (Stake viewers can't do this)
- **Status:** Planned — nice to have, not critical for first 50 DAU

### T-008: Personal Network Outreach
- **What:** Message 50 friends/contacts individually, give each $10 free to try the platform
- **How:** Individual DMs (WhatsApp, iMessage, etc.) with a personal ask + challenge link
- **Expected cost:** $100-200 in free balances
- **Expected result:** 10-20 signups from 50 messages
- **Downsides:**
  - Burns social capital — people don't love being pitched by friends
  - Friends may play once to be polite and never return
  - T-001 exploit applies: free balance + bots = free money extraction
  - Small, finite pool — you can only do this once
- **Mitigations:**
  - Frame as "I need testers" not "use my product"
  - Bonus balance with wagering requirement (must fix T-001 first)
  - Ask for honest feedback, not just play time
- **Status:** Planned — viable immediately but depends on T-001 fix

### T-009: Challenge Links (Viral Loop)
- **What:** Shareable link that lets a player challenge a specific person to a money match
- **How:**
  1. After a win, show "Challenge a friend" button
  2. Generates: hard2kill.gg/c/[id] with match details (game, bet, challenger name)
  3. Friend clicks → signs up → match starts between both players
  4. Friend gets first-match bonus (with wagering requirement)
- **Expected cost:** $5-10 per new user acquired (the first-match bonus)
- **Expected result:** Each player who shares brings 0.5-2 new players
- **Downsides:**
  - Requires engineering work (3-4 days to build)
  - Only works if existing players are motivated to share (need a reason)
  - Challenge recipient may sign up but never play another match
  - If friend gets bonus + plays bots → T-001 exploit again
- **Mitigations:**
  - Challenge bonus ONLY applies to the challenged match (not free to spend on bots)
  - Give the challenger a reward too ($5 bonus when friend deposits) for mutual incentive
  - Make sharing dead simple: one tap to WhatsApp/iMessage/Twitter
- **Status:** Must build — this is the #1 organic growth mechanic

### T-010: Middlemen as Affiliates
- **What:** Convert Discord wager middlemen into Hard2Kill affiliates
- **How:**
  1. DM middlemen: "I automate what you do. Refer players, earn 20% of their deposits."
  2. Give them $50 free balance to test
  3. Set up tracking (unique referral code per middleman)
- **Expected cost:** $50 per middleman + 20% ongoing rev share
- **Expected result:** 1 active middleman could send 5-20 players/month
- **Downsides:**
  - Middlemen might not care — they enjoy the social status of being a middleman
  - 20% rev share is high — need to make sure unit economics work
  - If the platform has bugs or bad UX, middlemen's reputation is on the line — they'll stop promoting
  - Tracking/affiliate system needs to be built
- **Mitigations:**
  - Start with simple tracking (unique promo codes, manual tracking in spreadsheet)
  - Don't over-promise. Let them try it and decide themselves.
  - Fix any bugs they report immediately — they're your most valuable feedback source
- **Status:** Planned

---

## LESSONS LEARNED

### L-001: Never give away withdrawable cash without wagering requirements
- **Source:** T-001 failure
- **Rule:** Any promotional balance must require 3-5x wagering before withdrawal, or be locked until a real deposit is made. This is non-negotiable. The entire iGaming industry does this for exactly this reason.

### L-002: Reddit is not a viable channel for self-promotion
- **Source:** T-002 failure
- **Rule:** Don't spend time trying to post on Reddit. The only possible play is a tournament announcement framed as a community event, not product promotion.

### L-003: Bots are exploitable with free money
- **Source:** T-001 failure
- **Rule:** If users get free money AND can play bots, they will extract it. Either: bots must be hard enough to win ~50%, or bot wins from bonus balance don't count toward withdrawal, or bonus balance only works in coin mode.

---

## TACTIC TEMPLATE (Copy this when adding new tactics)

```
### T-0XX: [Name]
- **What:** One sentence description
- **How:** Step by step implementation
- **Expected cost:** $X per Y
- **Expected result:** What you expect to happen
- **Downsides:**
  - Downside 1
  - Downside 2
- **Mitigations:**
  - How to handle each downside
- **Status:** Tried (result) / Planned / Abandoned
```
