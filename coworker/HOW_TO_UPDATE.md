# How to Update Coworker Environment

> Quick reference for keeping coworker files in sync with actual development work.

## The Simple Way

Just type this in Claude Code:
```
update coworker files
```

Claude will:
1. Explore what you've built recently (git status, new files, recent commits)
2. Update `FOCUS.md` with current priorities
3. Add entry to `CHANGELOG.md` with session summary
4. Update/create relevant product/marketing/engineering docs
5. Capture learnings and open questions

**You don't need a special command.** Natural language works.

---

## When to Update

Update coworker files when:
- You complete a major feature
- You make a strategic pivot (like switching from Hard2Kill to Geostakes)
- You learn something important about the market/users
- You finish a work session (end of day)
- You're about to start marketing (document what's built first)

---

## What Gets Updated

### Always
- **FOCUS.md** — Current goal, what's built, what's next
- **CHANGELOG.md** — Date, session summary, files changed

### Sometimes (as needed)
- **product/*** — Build logs, feature specs, design decisions
- **marketing/*** — Campaign plans, content calendars, growth tactics
- **knowledge/*** — Learnings, competitor analysis, user research
- **engineering/*** — Architecture decisions, tech debt, scaling plans
- **vision/*** — Market positioning, investor updates, strategic shifts

---

## Manual Update Checklist

If you want to update yourself instead of asking Claude:

1. **Update FOCUS.md:**
   - Change "Last updated" date
   - Update "Current Priority" section
   - Add/remove items from "What's Built"
   - Update "Next Steps" based on what's actually next
   - Update success criteria if goals changed

2. **Add CHANGELOG.md entry:**
   - New section with today's date
   - Brief summary of what was built
   - Key decisions made
   - Files created/updated
   - Learnings/insights

3. **Create/update domain docs:**
   - Product build logs (like `GEOSTAKES_BUILD_LOG.md`)
   - Marketing campaign plans
   - Engineering architecture docs
   - Knowledge base entries (competitors, learnings)

4. **Commit untracked coworker files:**
   ```bash
   git add coworker/
   git commit -m "Update coworker env: [brief description]"
   ```

---

## Example Natural Language Commands

Instead of `/update`, just say:

- "update coworker files"
- "document what we built today"
- "add a changelog entry for the profile page"
- "update FOCUS.md with current state"
- "create a marketing doc about the TikTok strategy"
- "add learnings about bonus balance system to knowledge base"

Claude will figure out what files to update based on context.

---

## Why This Matters

The coworker environment is your **strategic memory**. Code shows what you built. Coworker shows **why** you built it.

Without regular updates:
- You forget why you made decisions
- You repeat mistakes
- You lose strategic context when returning after a break
- You can't hand off to others (contractors, co-founders, investors)

**5 minutes documenting now = hours saved later.**

---

## Template: CHANGELOG Entry

```markdown
## [Date]

### [Session Name]
**Focus:** [One sentence summary]

**What Was Built:**
- [Feature/page/system]
- [Another feature]

**Key Decisions:**
- [Why you chose X over Y]
- [Important architectural choice]

**Learnings:**
- [What you discovered about users/market/tech]

**Updated Files:**
- `path/to/file.ext` — [What changed]

**Next Actions:**
- [What needs to happen next]
```

---

## Auto-Update (Future)

If Claude Code adds support for custom skills/commands, this would be the ideal flow:

```bash
/update
```

Claude would:
1. Run `git status` and `git log` to see recent changes
2. Explore new directories and files
3. Auto-generate CHANGELOG entry
4. Update FOCUS.md based on code changes
5. Ask "Anything else to document?" before finishing

**For now:** Just ask Claude in natural language. It's nearly as fast.
