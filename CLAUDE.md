# Hard2Kill Monorepo

Single repo containing all Hard2Kill code and strategy.

## Structure

- `hard2kill/` — Main platform (Next.js web + Colyseus server, Supabase, Stripe)
- `geostakes/` — Parallel MVP (GeoGuessr-style 1v1 wagering, Next.js + Supabase Realtime)
- `cs16-wagering/` — CS 1.6 WASM build + wager integration (single-game strategic bet)
- `cs/` — CS droplet infra and AMX config (161.35.99.157, fps.hard2kill.me)
- `coworker/` — Strategy, vision, product, marketing, engineering, knowledge docs

## Working here

- Live source code lives under each `*/` folder. Strategy and decisions live under `coworker/`.
- When making strategic decisions, document the reasoning in the relevant `coworker/` subfolder.
- Build on existing documents rather than creating duplicates.

## Coworker subfolders

- `coworker/vision/` — Company direction, market thesis, competitive landscape
- `coworker/product/` — Roadmap, feature specs, game design, UX decisions
- `coworker/marketing/` — Growth strategy, messaging, launch plans, channels
- `coworker/engineering/` — Architecture decisions, scaling strategy, tech debt
- `coworker/knowledge/` — Research, learnings, accumulated decisions
- `coworker/FOCUS.md` — Current 30-day plan
- `coworker/CHANGELOG.md` — Session log
