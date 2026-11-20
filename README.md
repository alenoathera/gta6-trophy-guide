# Leonida Ledger — Grand Theft Auto VI Trophy Guide & Tracker

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/alenoathera/gta6-trophy-guide/rank.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/alenoathera/gta6-trophy-guide/reward.svg)](https://make.fun/c/gta6-trophy-guide-01)

An offline fan guide and interactive platinum tracker for all **55 Grand Theft Auto VI trophies** on PlayStation 5 — built for the [make.fun gta6-trophy-guide-01](https://make.fun/c/gta6-trophy-guide-01) competition.

- **Owner:** [alenoathera](https://github.com/alenoathera)
- **Repository:** `alenoathera/gta6-trophy-guide`
- **License:** MIT

## Features

- **All 55 PlayStation 5 Trophies:** Official trophy names, descriptions, and grades (1 Platinum, 2 Gold, 6 Silver, 46 Bronze; 28 hidden), verified live against Exophase and PSNProfiles on **20 Nov 2026**.
- **Original Strategy Guides:** Custom, thoroughly written guides for every single trophy, with direct citations to verified sources. Where in-game locations or branching choices require post-launch confirmation (GTA VI launched 19 Nov 2026), this is noted honestly.
- **6-Stage Platinum Roadmap:** Optimized order of completion covering story missions, stranger strands, mini-game challenges, collectibles, criminal operations, and 100% completion cleanup.
- **Missable Watch List:** 14 missable trophies flagged with specific mission triggers, warning notes, and backup save recommendations.
- **Client-Side Tracker:** Local storage progress persistence, visual completion bars, category chips, search filtering, and complete JSON export / import backup.
- **Anti-Spoiler Shield:** Conceals unearned story trophy names and descriptions to protect your narrative experience.
- **100% Offline:** Zero external network calls, fonts, or CDNs. Served entirely from static assets under `app/`.

## Running the App

Start the included static server:

```sh
node serve.ts
```

Open your browser at <http://localhost:8080>.

You can also append query parameters for demonstration:
- `?demo=1`: Pre-populates 13 earned demo trophies (showing live counters and roadmap progress).
- `&trophy=17`: Directly opens the detail guide for *The Shootist*.
- `&spoiler=on`: Activates the Anti-Spoiler Shield by default.
- `&kind=missable`: Pre-filters the checklist to missable trophies.

## Handing In (Submission Build)

Generate the submission dossier and bundle:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` uses Node 22 standard library to bundle `app/` and `screenshots/` into the target directory and generate `/output/dossier.json` using the vendored `vendor/makefun-frontend.ts` tool.

## Verified Sources

- **Exophase** — Grand Theft Auto VI Trophies (PS5): <https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/>
- **PSNProfiles** — Grand Theft Auto VI Trophies: <https://psnprofiles.com/trophies/43531-grand-theft-auto-vi>
