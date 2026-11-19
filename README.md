# Leonida Ledger — GTA VI Trophy Guide & Tracker

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/alenoathera/gta6-trophy-guide/rank.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/alenoathera/gta6-trophy-guide/reward.svg)](https://make.fun/c/gta6-trophy-guide-01)

An offline guide and tracker for all **55 Grand Theft Auto VI trophies** on PlayStation 5 — built for the [make.fun gta6-trophy-guide-01](https://make.fun/c/gta6-trophy-guide-01) competition.

- **Owner:** [alenoathera](https://github.com/alenoathera)
- **Repository:** `alenoathera/gta6-trophy-guide`
- **License:** MIT

## What it is

- **Checklist of all 55 trophies** with their official names, descriptions and grades (1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden), checked against Exophase and PSNProfiles on 20 Nov 2026.
- **A guide in our own words for every trophy**, with its sources named and linked beside it. GTA VI launched 19 Nov 2026, so any step not yet checked in the game says so honestly instead of inventing a location.
- **Platinum roadmap** in six stages, built from the official descriptions (story chapters and named missions, character and stranger strands, collectibles, activities, money and cleanup).
- **Missable watch list** — 14 trophies tied to a specific mission or choice, flagged so you do them on time.
- **Tracker:** progress saved in the browser (localStorage), export to a `.json` file and import it back, filters by kind (story, missable, collectibles, activities, combat, exploration, money, hidden), by grade and by earned state, plus a search box.
- **Spoiler setting** that hides story trophy names and descriptions until they are earned.
- **Fully offline:** static files under `app/`, no build step, no network request at run time. No Rockstar logo or official artwork anywhere.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. Any static file server works too — serve `app/` at its root.

Add `?demo=1` to the URL to load demo progress (13 of 55 earned) and see the counters and roadmap part-way.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `/output/dossier.json` with the vendored `vendor/makefun-frontend.ts` library.

## Sources

- Exophase — Grand Theft Auto VI Trophies (PS5): https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/
- PSNProfiles — Grand Theft Auto VI trophies: https://psnprofiles.com/trophies/43531-grand-theft-auto-vi
