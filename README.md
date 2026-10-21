# DCC Table

A virtual tabletop for running D&D 5e (2014) at the table: the DM runs everything from a laptop, and a second
browser window on the TV shows players the map.

## Features

- **Two screens.** The DM screen (`/`) has every control. The table view (`/#/table`, opened with **📺 Open table view**)
  shows only what players should see: the map, revealed fog, visible tokens with health bars (no numbers), the turn
  order, public rolls and loot. Drag that window onto the TV and press **Fullscreen**.
- **Maps.** Upload any image or start from a built-in map (tavern, dungeon, forest, cave, crossroads, blank).
  Multiple scenes; pick which one the players see. Square grid with snapping, resizing and an "align to map" tool.
- **Fog of war.** Manual reveal and hide with boxes or a brush. Undo with Ctrl+Z.
- **Drawing and measuring.** Freehand, lines, boxes, circles and text (optionally DM-only); a ruler; sphere, cone,
  cube and line area templates that highlight the squares they cover.
- **Monsters.** All 334 SRD monsters with full stat blocks. Click any attack, save, skill, ability or dice to roll it.
  Make custom monsters by hand or by pasting a stat block.
- **Combat.** Initiative tracker with per-monster or grouped rolls (4+ of a kind), typed-in player initiative,
  turn/round tracking, HP damage/heal/temp (dice allowed, e.g. `3d6`), 14 conditions plus common effects,
  concentration save reminders, hidden monsters.
- **Party.** Import characters from D&D Beyond (read-only; the character must be set to Public) or add them by hand.
- **Loot.** Loot Box Forge is built in: open a box, pick items, send them to the party loot list, show them on the table.
- **Dice.** Dice tray with advantage/disadvantage and public or hidden (DM only) rolls, plus a roll log.

Everything is saved in the DM's browser (IndexedDB). Use **☁ Cloud** to move a campaign between computers
(save on the desktop, load on the laptop), or **Scenes → Download backup** for a file copy.

## Cloud save setup (one time)

1. In Supabase, open **SQL Editor → New query**, paste the contents of `supabase/setup.sql`, and press **Run**.
2. Optional: in **Authentication → Sign In / Providers → Email**, turn off **Confirm email** so new accounts work
   right away. Otherwise click the link in the confirmation email before signing in.
3. In the app, press **☁ Cloud → Create account**, then sign in with the same account on each computer.

## Keyboard

| Key | Action |
| --- | --- |
| V | Select / move |
| M | Ruler |
| P | Ping |
| R / H | Reveal / hide fog box |
| D | Freehand draw |
| E | Erase |
| N | Next turn (during combat) |
| Delete | Remove selected tokens or template |
| Ctrl+Z | Undo map change |
| Space + drag, right-drag | Pan |
| Shift + drag | Box-select tokens |
| Esc | Back to select |

## Running locally

```bash
npm install
npm run dev
```

## Deploying (Vercel, free)

1. Sign in at https://vercel.com with GitHub.
2. **Add New → Project**, pick this repository, keep the detected **Vite** settings, and press **Deploy**.
3. The `api/ddb.js` function deploys with it. The D&D Beyond import uses it to fetch characters.

## Data scripts

- `scripts/build-monsters.mjs` converts the 5e-bits SRD monster file into `public/data/monsters.json`.
- `scripts/build-maps.mjs` generates the built-in maps in `public/maps`.

## Credits

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC,
available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the
Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/legalcode).
Monster data was converted from the [5e-bits/5e-database](https://github.com/5e-bits/5e-database) project.

Not affiliated with Wizards of the Coast or D&D Beyond.
