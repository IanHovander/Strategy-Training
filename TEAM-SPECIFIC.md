# Team-specific content

This project features FRC team **5026, the Iron Panthers**: its number, name, panther logo, red team colours, merch,
mascot and people. This file lists every place that would have to change for another team to make it theirs. Keep it
up to date: whenever you add or move something specific to 5026, add an entry here (AGENTS.md says the same).

Paths are from the repo root. Line numbers are approximate (files change), so each entry also names the function or
constant to search for.

## Start here: the shared places that change most of the game at once

Change these first. Most scenes take their merch, colours and robot from them, so the rest of the list gets shorter.

| What | Where | Change |
| --- | --- | --- |
| The player's name | `public/team-manager/player.js` | Nothing to change: NEW SEASON asks the player's name and it goes on the strategist's name tag (`HERO_NAME` in `cast.js`). |
| The strategist's tee (walking sprite) | `public/team-manager/walker.js`, `PAL` (`shirt`, `print`, `hem`), ~lines 152-162 | The new team's shirt ramp (dark, mid, lit) and print colour. Every look built from `HERO_LOOK` follows. |
| Team merch for everyone | `public/team-manager/cast.js`, `MERCH` and `student()`, ~lines 274-287 | Follows `walker.js` and `teammate.js` once those change; rename the `5026-` ids and comments. |
| The team-red shirt tone | `public/team-manager/cast.js`, `tones.shirtRed`, ~line 24 | Point it (or a new `team` tone) at the new colours; used wherever someone wears team colours. |
| The teammate's hoodie and badge | `public/team-manager/teammate.js`, `PALETTE` ~26-29, `TEAMMATE_LOOK.pal` ~289-290, `TEAMMATE_LOOK.badge` ~304-305 | The new hoodie ramp, and repaint the mini badge (logo + number). The badge is reused on every student hoodie. |
| The robot's number | `public/team-manager/sprites.js`, `eleBot()` default `num`, ~line 120 | The new number: the intro, the title and the arena all show it. |
| The field's robots | `public/team-manager/field.js`, `robots()` default teams, ~lines 352-353 | Replace `'5026'` (the arena passes its own teams; see below). |
| The logo image | `public/img/panther.png` | The new team's logo, white on transparent (it's used as a CSS mask). |
| The favicon | `public/img/favicon.png` | The new team's icon. |
| The site's brand colours | `public/css/base.css`, `:root`, ~lines 14-23 | `--red` and `--red-hi` (and greys) to the new brand colours. |

The panther logo is also drawn in pixels, separately, in several scenes (a sprite called `BADGE` or `HEX`). Each is
listed below; they all need redrawing as the new logo.

## The team manager game: shared files (`public/team-manager/`)

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `hero.js` | `PALETTE` ~31-35; `BODY` rows ~81-85; header line 2 | Title portrait in the red 5026 shirt (#a1172a #d3212f #ff6a55, print #fff4ee) with "5026" drawn in pixels | New shirt colours, redraw the number (built from `scripts/art/strategist/`). |
| `hero.html` | "What to look at", ~line 82 | "the red 5026 team shirt" | Describe the new shirt. |
| `teammate.js` | `BODY` ~44-135, `HEADS` ~188-282; `BODY` rows ~79-85; header 1-4 | A likeness of a real 5026 member traced from a photo; the panther badge and "5026" on the hoodie chest | Redraw from a member of the new team (with their consent) or a generic face; redraw the chest (built from `scripts/art/teammate/`). |
| `teammate.html` | intro ~52; "What to look at" ~76-79 | "drawn from a photo", the red hoodie, the panther badge and 5026 | Rewrite for the new character and merch. |
| `cast.js` | header line 7; "Team 5026" section ~274-276 | Comments naming 5026 and its merch | Rename. |
| `sprites.js` | drive team ~261-272 | Ids `5026-driver-2`, `5026-coach`; the far driver's tee hard-coded in team reds | Rename; use the new team's darker shades. |
| `sprites.js` | `defBot()` ~162; `hab()` ~349-376 | Rival `7777` on red; 5026 assumed to be on blue in the intro | Optional: another rival number; blue can stay. |
| `field.js` | `robots()` comment ~368 | "7777, playing defence in front of the blue rocket" | Optional, with the rival. |
| `bleachers.js` | `PEOPLE`: rosa ~21-26, milo ~39-43, dani ~56-61, priya ~78, juno ~47-53 | "ROSA, 5026 PARENT", "...I'M JOINING 5026", "DANI, 5026 ALUM" (with a team-history line), "THEN 5026 RIGHT AFTER", "SCOUTING FOR 7777"; their team-red shirt prints | New number, colours and history; rival optional. |
| `bleachers.js` | `DRIVE_SHIRTS` ~108 | The blue alliance's first driver wears `tones.shirtRed` | The new team tone. |
| `stage.js` | `markup()` ~167 | Phone status bar "● 5026" | The new number. |
| `stage.css` | `--red` ~5, `.status b` ~45, `.knob` ~63 | Team red on the phone's status and stick knob | The new colours. |
| `intro.js` | the shots and `ROSTER`; `scoreCard` ~483-493 | The hero robot (5026 via `eleBot`) is blue and "BLUE WINS!" | Nothing unless the team wants red; the number follows `sprites.js`. |
| `walk.html` | "How she's made" ~42, ~45 | "a 5026 parent... a 5026 alum... a scout from 7777", "two matches before 5026's" | New number (and rival). |
| `scenes.html` | scene cards ~30-36 | "Iron Panthers on three", "5026's robot", "the second for 5026", "Newton, 5026's division" | New name, chant, number and division. |
| `index.html`, `play.html`, every scene's `index.html` | `<link rel="icon">` | The panther favicon | Follows `public/img/favicon.png`. |
| `assets/norbert.png` | whole file | Norbert, the team mascot (a penguin with "26" on one ear); used small in the time travel lab (`norbert.js`) | Replace or delete. |
| `norbert.js` | `ROWS`, `PAL` | Norbert drawn small (16x19) for the corner of the screen, with his red 26 ear that glows | Redraw as the new team's mascot, or another lucky charm. |
| `time/lab.js`, `time/index.html` | `looks()` (`'5026'`), the page's intro | The strategist is found in the cut scene as 5026's rep; "the rep in the red tee" | The new number and shirt colour. |
| `songs/compete-to-win-3.mp3` | whole file | The intro song (generated); its words haven't been checked for the team's name | Listen, and replace it if it names the team. |

## The scenes

The strategist's red dialog name tag (`tag: C.red1`, or a `RED` constant) appears in several scenes; it's her tee's
colour, so it can follow the new team colour or stay as a UI accent.

### Team meeting (`public/team-manager/team-meeting/`)

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `cutscene.js` | beats 2, 18, 19 (~266, ~352, ~365) | "OKAY, PANTHERS!", "IRON PANTHERS ON THREE!", "IRON PANTHERS!" | The new mascot and break chant (38 characters a line at most). |
| `cutscene.js` | beat 12 ~307 | Sponsor shout-out "RIVERSIDE MACHINE WORKS" (invented) | Optional: the team's real sponsor. |
| `place.js` | `paintSign()` ~377-387 | Red "IRON PANTHERS" sign over the shop door | New name and colours. |
| `place.js` | `BADGE` ~389-406; `paintBanner()` ~408-428 | Pixel panther logo; red banner with "50"/"26" | Redraw the logo; new number and cloth colour. |
| `place.js` | `paintShop()` ~361 | `eleBot(... num: '5026' ...)` in the shop | The new number. |
| `place.js` | `BAG` ~53; `GRASS` ~37-39; `easel()` ~788-789 | Red backpack; grass picked to set off the team red; the "RIVERSIDE" thank-you card | Recolour; check the grass still contrasts; sponsor optional. |
| `layout.js` | `BAGS` ~36 | A bag in team red | Optional recolour. |
| `people.js` | `ALT` ~301, `RED_CAP` ~302, `SCRUNCHIE` ~303 | Alternate tee print, team cap and scrunchie in team red | The new colours (the cap is `CAPS` in `cast.js`). |
| `people.js` | `member()`, `LOOKS` | Everyone in team merch with the panther badge | Nothing once `cast.js`/`teammate.js` change. |
| `lines.js` | `LINES.okafor` ~152, `LINES.nadia` ~132, `LINES.bea` ~113-116 | "SIGN RIVERSIDE'S CARD"; "OUR PRACTICE BOT. TWO-STAGE ELEVATOR" | Optional: sponsor; describe the new robot. |
| `index.html` | intro ~16; "How it's made" ~26-33 | "the whole of 5026", the IRON PANTHERS sign, red merch and panther badge, the chant, "on 5026's drive team" | New number, name, chant, colours, logo. |
| `cutscene.js`, `place.js`, `people.js`, `lines.js`, `scene.js` | comments; `scene.label` ~225 | Comments and the screen-reader label naming 5026, the chant and the red merch | Update. |

### Practice field (`public/team-manager/practice-field/`)

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `room.js` | `VINYL` ~51; `HEX` ~301-304; `teamBanner()` ~305-319 | Banner in the hoodie's reds with a pixel panther logo, "5026" and "IRON PANTHERS" | New colours, logo, number and name (check the width). |
| `halffield.js` | `teamNumber()` ~181-191, `stationWall()` ~219 | "5026" painted down the driver station | The new number (check it fits). |
| `halffield.js` | header; `BLUE` throughout | The homemade field is the blue half | Optional: keep blue. |
| `robot.js` | `robot()` ~108 | `eleBot(... num: '5026' ...)` | The new number. |
| `people.js` | `JALEN` ~40; `LOOKS.okafor` ~52-53 | Red team cap; mentor's polo with the red logo (teal chosen to contrast with red) | New colours; a polo that contrasts with them. |
| `people.js` | `hoodie()`, `LOOKS` | Team merch with the panther badge | Nothing once `cast.js`/`teammate.js` change. |
| `words.js` | `SCENE_TEXT.label` ~24 | "5026's robot runs timed hatch cycles" | The new number. |
| `index.html` | intro ~16; "How it's made" ~26-30 | "team 5026", the red 5026 banner, 5026 on the station, 5026's robot | New number and colour. |
| `room.js`, `people.js`, `scene.js`, `words.js`, `cutscene.js` | comments | Comments naming 5026 | Update. |

### The van (`public/team-manager/van/`)

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `cabin.js` | plate ~652-666 | Licence plate "IRNPNTR" (with custom N glyphs) | A new 7-character plate. |
| `cabin.js` | `HEX` ~284-295, `hexBadge()`; `makeTrailer()` ~346-348 | Pixel panther logo and "5026" on the trailer's nose | Redraw the logo; the new number. |
| `cabin.js` | `spareBumper()` ~387, `cargo()` ~443-446 | Spare bumpers with "5026" | The new number. |
| `outside.js` | door magnet ~500-513 | Mini hexagon and "5026" on the van door | Redraw; the new number. |
| `outside.js` | `HEX` ~632-649, `makeTrailer()` ~696-701 | Trailer side: logo, "5026", "IRON PANTHERS" | Redraw; number and name (fits 56 px). |
| `outside.js` | `BADGE_INK` ~34 | The panther badge's black | The new logo's dark colour. |
| `layout.js` | `RAMP.trailer` ~95 | The trailer in 5026 red | The new colours. |
| `script.js` | `RED` ~47; `LABEL` ~41-44 | Her red name tag; "Team 5026's passenger van... red team trailer" | New colour and number. |
| `people.js` | riders | Team merch | Nothing once `cast.js` changes. |
| `index.html` | intro ~21; "How it's made" ~32 | "team 5026", the red trailer with the panther and 5026, the IRNPNTR plate | Update. |
| `cabin.js`, `outside.js`, `scene.js`, `script.js` | comments | Comments naming 5026 | Update. |

### The pits (`public/team-manager/pits/`)

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `teams.js` | `TEAMS` ~16; `ROW` ~20 | `5026: { name: 'IRON PANTHERS', tone: tones.shirtRed, ... }`; 5026 is the 7th pit of `['3000','1024','7777','4000','2468','6060','5026','1357']` | New number, name and tone at the same index; change any neighbour that equals the new number. |
| `set.js` | `STATE` ~93, `DRESS` ~110 | Keyed by '5026': an elevator on blue bumpers for match 44 | The new number. |
| `set.js` | `BADGE` ~194-209; `banner()` ~228-235 | Pixel panther logo on 5026's banner only | Redraw; the new number in the check. |
| `set.js` | `standing()` ~771-783, `BLOCKS` ~847-848; option `pit5026` | `p.num === '5026'` special cases for the home pit | The new number (or a shared constant); rename the option. |
| `set.js` | `RED` ~79 | 5026's red ramp, reused for two other chests | Only if red should mean the home team. |
| `people.js` | `PEOPLE` kowalski ~306 | "MS. KOWALSKI, 5026 MENTOR" | The new number. |
| `lines.js` | `ELI` ~17; `SCRIPT.call` ~26; `SCRIPT.ready` ~33-34 | "ELI, 5026 DRIVER"; "BLUE 5026, 2020 AND 7009" with opponents 1100, 3141, 6174; "THAT'S US... BLUE ALLIANCE" | The new number; swap any partner or opponent that equals it. |
| `lines.js` | `LINES.oscar` ~95; `RUN_WARNING` ~112 | "BRING SOME 5026 ONES... PANTHERS FOR ODDS"; "HEY, 5026! NO RUNNING" | New number and mascot. |
| `cutscene.js` | `rollOut()` ~271; B5a ~336 | `drawCartBot(... num: '5026' ...)`; "NOOR, 5026 OPERATOR" | The new number. |
| `cutscene.js` | `CART`, `NOOR`, `PIT`... ~84-151 | Positions for the home pit (7th in `ROW`) | Keep the home team at index 6. |
| `index.html` | intro ~16; "How it's made" ~27-34 | "5026's robot", "the panther in a hexagon on ours", "5026 is called right after" | Update. |
| `set.js`, `people.js`, `lines.js`, `cutscene.js`, `scene.js` | comments | Comments naming 5026 | Update. |

### The arena (`public/team-manager/arena/`)

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `scene.js` | `LINES` rosa, milo ~38-45 | "YOU ARE ON 5026?", "...I'M JOINING 5026" | The new number. |
| `scene.js`, `cutscene.js` | comments ~18-35, `QUEUE_CALL` ~77 | Comments naming 5026 | Update. |

### Alliance selection (`public/team-manager/alliance-selection/`)

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `layout.js` | `RANKED` ~207-218 | 5026 ranked 11th among 32 invented numbers | The new number in its slot; swap any listed number that equals it. |
| `layout.js` | `repTag()` ~221, `ALLIANCES` ~229, `WAITING` ~238; `FIRST_CAPTAINS`, `BACKUPS`, `DECLINED` | '5026' as Alliance Two's first pick with 3000 and 6060; other numbers that might clash | The new number (or a shared constant); swap clashes. |
| `cutscene.js` | `makeCutscene()` ~283-287 and every beat's moves | '5026' is the strategist's id and gets the red tag | The new number. |
| `cutscene.js` | invite2 ~644, accept2 ~689-690, boards ~713, ~725 | "TEAM 3000 RESPECTFULLY INVITES TEAM 5026", "TEAM 5026 ACCEPTS!", "CONGRATULATIONS, 5026!", display rows | The new number. |
| `cutscene.js` | herTurn ~425 | "RANKED ELEVENTH. WE NEED A CAPTAIN TO PICK US." | Keep, or match the team's story. |
| `people.js` | `LOOKS['5026']` ~164, crowd filter ~185, `MC_LINES` ~266 | Keys and "NICE ANSWER, 5026!" | The new number. |
| `people.js` | `REPS` ~78-111 | Reps' shirts avoid red, "red is 5026's" | If the team isn't red, re-pick any rep in the new team colour. |
| `people.js` | `WORDS` sam ~248, lena ~200 | "A FIRST PICK!", "YOU HUNG HATCHES WITH US" | Keep, or match the team's story. |
| `index.html` | intro ~20; "How it's made" ~41-44 | "5026 finished eleventh", "Nobody else wears red", the invite | Update. |
| `cutscene.js`, `people.js` | comments | Comments naming 5026 | Update. |

### World Championship (`public/team-manager/worlds/`)

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `layout.js` | `DIVISIONS` Newton ~31; `HOME = 7` ~34 | 5026 on Newton's second cart; Newton is "5026's division"; other Newton numbers might clash | The new number; swap clashes; `HOME` can be another division. |
| `cutscene.js` | the teammate's beat ~323-324; her beat ~341 | "WE DREW NEWTON... WIN NEWTON AND WE PLAY ON EINSTEIN"; her red tag | Match the division; the tag colour. |
| `people.js` | `TEAM['5026']` ~181, `SECTIONS` ~205, `lookOf()` ~437 | 5026's block in Newton's stands, in red merch | The new key. |
| `people.js` | `BEHIND_HER` ~186 | Shirts picked so her red tee reads against them | Re-pick if the new colour is close to khaki or blue. |
| `people.js` | `TALKERS` Bea ~247, Grace ~331 | "5026 IS ON THE SECOND CART", "WELCOME TO HOUSTON! 5026?" | The new number (and division). |
| `index.html` | intro ~16; "How it's made" ~30-32 | "5026's robot", "5026's own section in the red tee" | Update. |
| `cutscene.js`, `people.js`, `layout.js` | comments | Comments naming 5026 | Update. |

## The rest of the site (Game Night and Strategy Training)

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `public/host.html` | `.team-tag` ~17 | "Iron Panthers · FRC 5026" | New name and number, or remove. |
| `public/css/host.css` | `.game-bar::after` ~191, `::before` ~205-209 | "IRON PANTHERS" and the panther mask in the big screen's footer | New name and logo. |
| `public/css/base.css` | header ~1-3; `.logo` ~92-118; backgrounds ~49-83, `.bar-title` ~120 | "follows the Iron Panthers (FRC 5026) brand bible"; GAME [panther] NIGHT lockup; the honeycomb, shards and heading bars from the brand | Name the new brand; point the mask at the new logo and refit it; keep or swap the hexagon motif. |
| `public/img/shards.svg` | fill colours | The team reds #9a0000 and #c80f14 hard-coded | The new primary and highlight colours. |
| `public/img/honeycomb.svg` | whole file | The brand's hexagon motif | Keep or replace. |
| `public/css/arena.css` | header ~1-3 | "the brand colors, the panther" | Reword. |
| `public/css/phone.css` | `.spinner` ~25-31 | "the panther breathes" loading spinner | Follows `panther.png`; update the comment. |
| `public/lessons.html` | theme-color ~6; `<style>` ~14-37 | #9a0000, "Only the Iron Panthers brand colors", duplicated brand colours, the panther in the "Strategy Lab" logo | Match `base.css`; new name and logo. |
| `public/index.html`, `public/check.html` | theme-color ~6 | #9a0000 | The new primary colour. |
| `public/js/avatar.js` | `RED` ~12; pose 8 ~170 | Team highlight red; avatar 8 is a "panther cub" | New colour; optionally the new mascot. |
| `games/odd-one-out/style.css` | `.ooo-secret.face-down::before` ~129-138 | The panther on the card back | Follows `panther.png`; update the comment. |
| `games/tap-race/style.css` | sunburst ~106 | The team highlight red hard-coded | The new colour (better, a CSS variable). |
| `games/frc-strategy/picklist.js` | header line 1 | "modeled on the Iron Panthers 2026-scout picklist" | Reword. |
| `games/frc-strategy/alliance.js` | `matchOdds()` ~130 | Random seed 5026 | Any number works; optional. |
| `README.md` | look notes ~348; links ~27-35, ~195 | "The look follows the Iron Panthers brand"; the owner's GitHub Pages links | Name the new brand; the new owner's links. |
| `docs/adding-a-game.md` | ~231; ~7, ~125 | "Brand colors (Iron Panthers)"; links to the original repo | Reword; new links if needed. |

## Art sources (`scripts/art/`)

These build the portraits and sprites in `public/team-manager/`; change them and rebuild.

| File | Where | What's 5026-specific | Change |
| --- | --- | --- | --- |
| `strategist/strategist.txt`, `strategist/build.py` | palette ~14-16; comment ~31 | Shirt reds #ff6a55 #d3212f #a1172a; "the team's red 5026 shirt" | New colours; rebuild `hero.js`. |
| `teammate/palette.txt`, `portrait.py`, `build.py` | palette ~14-16; "The badge" ~88-100; comments | Hoodie reds; the panther badge and "5026" (a `DIG` table for 5, 0, 2, 6); a portrait of a real 5026 member | New colours, logo and number (add digits to `DIG`), a new face or a generic one; rebuild `teammate.js`. |
| `norbert/norbert.txt` (and `README.md` ~41-46) | whole file | Norbert, the team mascot | Replace or delete. |
