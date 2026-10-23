# Blue Banner: story and game design

**Status:** design notes from a brainstorm, not built yet. The team-manager scenes on the `claude/focused-fermi-2ntxyb`
branch are proofs that the engine can do this (pixel scenes, walking and talking, cutscenes, an alliance selection
set piece). Their story and dialogue are filler; don't treat them as canon.

**Fixed so far:** there's one main character, a new member of the strategy team; the game trains scouting and match
strategy; it starts in the 2019 season (Deep Space), though any season would work.

**The goal:** train new strategy team members. But first and foremost it has to be a game people enjoy, including
the parts where they fail and try again.

---

## 1. The idea in one paragraph

You're a rookie strategist stuck in a time loop. Every time your calls let the team down, you wake up in the van on
the Thursday of the same event. The robots are the same, but the dice and the match schedule aren't. The only thing
that carries over is your **scouting notebook**. Midway through the season you win a banner you didn't deserve, and
you still wake up in the van. That's when the alumni who built the loop introduce themselves: *"We don't reset
losses. We reset bad bets."* Their test for joining them is one event with no loop.

---

## 2. Why a time loop fits scouting

In loop games like Groundhog Day, Outer Wilds and Majora's Mask, progress is what you *know*. Scouting is the same:
writing down what robots do so you can decide better later. So the notebook is the one thing that survives a reset.

**The loop does not replay the same matches.** Each robot keeps its true abilities, but every loop re-rolls the luck
and shuffles the qualification schedule, as a real event would. Knowledge carries over; outcomes don't.

- Loop 1: you see 3000 climb to Level 3 twice and write "great climber".
- Loop 2: they fail it twice. Bad luck, or unreliable?
- By loop 4 the notebook says "5 of 9".

The player learns that one match is one sample without being told. It also stops later loops turning into
memorization.

---

## 3. Story

### Cold open: start with the boss fight

**Saturday, 12:38 PM, alliance selection.** The senior strategist is out sick. The captain hands you a clipboard:
"You're up. Who do we pick? 45 seconds." You have no data, only team names, a flashy robot and the loudest team in
the stands. You pick on gut feel and lose in the quarterfinals when a climb fails.

Cut to black. **Thursday, 6:40 AM, the van.** Norbert the mascot is in your lap. A teammate tells the joke you heard
on Thursday.

The first minute teaches why scouting exists: you had to decide and couldn't.

### The device and the clues

The loop lives in **Norbert**, the team's plush penguin (already drawn: `scripts/art/norbert/`). Clues build up
across loops:

- He's in a slightly different seat each time.
- There's a zip tie on him that nobody remembers adding.
- An old label is stitched inside his bow: *"Property of 26, Class of 2009."*
- A battery in the cart never appears in the battery log. A sharp scout notices. (It's inside Norbert.)
- At big moments, before the reveal, Norbert's ear glows (see section 4, the bet log).
- One field volunteer turns up at every event, never seems to age, and once says "Picking 3000 *again*?"

### The alumni

The device is the team's own alumni's off-season project. For years they've quietly looped promising strategists,
because every strategist has wished for a do-over. They call themselves the Blue Banner Society (name to be decided).

They introduce themselves straight after the Event 2 twist (section 5), in the first minute of that loop, so the
reset that breaks the player's understanding is explained right away.

### The council's trial and the epilogue

The test for joining is **one event with no loop**, ideally in a different season's game (such as 2022) to prove the
principles transfer and not just the 2019 details. In the group version this is the Showdown: each group is a team
of candidate strategists.

In the epilogue you put Norbert on the next rookie's van seat. The player becomes the trainer, which is the
real-world purpose of the game.

### Tone

No one gets disbanded or humiliated. The worst outcome is that the season moves on without a banner, which is what
happens to most real teams. Stakes come from people: the seniors' last season, Grandma's glitter sign on Saturday.

---

## 4. The loop rule

### What the player believes before the twist

**"The loop resets when the team falls short of its potential."** At the start of each event the mentor sets a
realistic target, such as "seed top 12 and get picked" or "reach the semifinals." Fall short and you wake up in the
van; meet it and the season moves on. Banners don't come into it.

At Event 1 the dice are nudged so that good calls meet the target and bad calls miss it. Results and decisions line
up, so the player's belief holds.

### The real rule, true from the start

**Bad bets reset the loop. Results don't.**

- A bad call that wins resets.
- Good calls that lose do not reset. The season moves on.

### What the player sees after the twist

- **Goal card** on the strategist's whiteboard, shown at the start of every loop and on the pause screen.
  Before the twist: *Win the event.* After: *Make the big calls right*, with a checklist.
- **The bet log.** Each event has 3 to 5 marked **big calls** (for example first pick, second pick, the finals plan,
  the last-20-seconds climb call). When one comes up, the game flags it (before the twist, Norbert's ear glows;
  after, it's labeled). Each call is graded by how close its win chance is to the best option available. The loop
  ends when no big call is graded bad.
- **Recap on waking in the van:**

  > *Thursday #4. Last loop: won the final.*
  > *Pick 1 ✓ · Pick 2 ✗ (31% vs 64%) · Final climb call ✗ (22% vs 58%)*

  The player always knows which call to change.
- **Event score:** the chance the player's calls gave the team, as a share of the best possible chance. "Your calls
  gave you 41% to reach the semis; perfect calls gave 46%. **89%.**" Always reachable, gradeable, and worth
  replaying to improve.

---

## 5. Banners

**A banner is a badge of extreme skill and luck. The path is extremely narrow.** Most players won't win one, and
winning one isn't the goal. No reset happens for failing to win a banner.

### Event 2: the forced banner (the twist)

Event 2 is the underdog event, so the bad call is **playing it safe**. If the player reaches alliance selection with
bad big calls, the playoffs are scripted so they win the banner anyway. Qualifications stay fair, so seeding still
means something.

A low-risk plan rarely wins by luck, so the luck has to come from **the other alliances breaking down**: the #1
alliance's elevator jams in the semis, a climber tips in the final. Banner, celebration, Grandma's sign... and then
the van.

The replay after the reset makes the point:

> **Banner chance with your calls: 3%.**
> You didn't win this. 4000's elevator did, by breaking.
> Your plan needed a miracle. The risky plan needed a coin flip: 38%.

That holds both lessons: luck isn't skill, and when you're the underdog, the safe plan is the long shot.

**If the player makes the right calls at Event 2**, it plays out fairly; they probably miss the banner and move on.
The alumni appear anyway: "Most strategists need us to reset them before they see it."

### Championship: threading the needle

There's one real banner in the game, and it's honestly rare. With **every** big call right, the Championship gives
roughly a 5–10% chance (to be tuned), and the true odds are shown before the final.

**Twist the knife:** the reset rule applies here too. If the player makes a bad call and luck carries them through
Einstein, they get the confetti, the banner going up... and then the van, at Thursday of the Championship. A
Championship banner only counts if it was earned twice: once by the strategist and once by the dice.

By now the player knows the rule and the bet log shows the ✗, so this reset is painful but not confusing. It's the
Event 2 lesson again, this time at the highest stakes.

This makes the Championship a true one-shot:

- Good calls, no banner: the result stands and the season ends. No second try.
- Good calls, banner: the result stands. A rare ending (the epilogue can say so: "one of eleven strategists the
  Society has seen do it").
- Bad call, win or lose: reset. Deliberately playing badly to reroll gains nothing, because a lucky banner never
  survives.

### Fair dice

The lesson depends on the player trusting the odds.

- Rig outcomes only in the scripted moments: the gentle nudge at Event 1, the forced banner at Event 2, and the one
  "right call, lost anyway" beat (section 6).
- **Never misstate the odds.** The game may choose which roll happens; the numbers it shows are always the true ones.
- Everywhere else, including the whole Championship, the dice are fair.

---

## 6. The season: each event teaches one lesson, and the next flips it

| Event | You are | The lesson | The tempting wrong answer |
|---|---|---|---|
| Cold open | Stand-in strategist, no data | You can't decide without scouting | Picking by reputation or flash |
| 1. First regional | Rookie; robot in the middle of the pack | Look at how consistent a robot is, not just its average; pick what complements your robot | Taking the highest average scorer |
| 2. Second regional | Underdog, seeded low | The safe plan can't beat the top alliance, so **take the risk**: a high-ceiling partner and the Level 3 climb call | Event 1's "pick the consistent one", which now loses |
| 3. Championship division and Einstein | Favorite (your robot improved) | Protect a lead and pick the floor; opponents scout you and adapt, so mix your plans | Event 2's gambles, which now throw away wins |
| Council trial | Alone, no loop, an unfamiliar game | All of it, once | — |

The flips are what make the risk lesson stick: a player who learns a rule too literally fails in a surprising way,
and the failure explains itself. It's the arc the Strategy Training lessons already argue ("Favorite: cut risk.
Underdog: add risk."), lived instead of read.

**Building each event:** each one is a hand-built puzzle. Robots get set true abilities so the right reasoning wins
about 70% of the time and the tempting picks about 30%. Every event's design should state its lesson, the tempting
wrong answer, how the failure reveals it, and its hint ladder (section 8).

**The "right call, lost anyway" beat:** script it once, after the rule is known, somewhere low-stakes (a
qualification match, or a semifinal at Event 3). The bet log shows all ✓ next to an L and the season moves on.

---

## 7. What you do each loop

The repeated work should be short and map to real strategy work:

1. **Thursday: robot focus.** Tell the build team what to fix: faster cycles, a reliable climb, a sandstorm auto or
   defense. A wrong choice shows up two days later.
2. **Scouting assignments.** You can't watch everything. Choose where your six scouts and your pit visits go. Teams'
   pit claims ("we climb Level 3") can be checked against what their robots actually do. Scouts get tired, so late
   Friday data is noisier.
3. **Qualification match plans.** About 30 seconds to plan and 10 to watch it play out: who goes to the rocket,
   who defends, and whether to chase the climb ranking point or the win.
4. **The boss: the pick list and playoff calls.**

**Rival strategists are scoutable too.** The 4000 captain always takes the top scorer; 2468 snipes the robot you
wanted. You learn their habits across loops just like robots. "Who will be gone by our pick?" is real pick-list
strategy, and it gives the boss fight the human drafting feel that makes the Showdown fun.

---

## 8. Making failure enjoyable

- **Every loop adds something permanent.** Notebook entries, and theories on your board confirmed or disproved. No
  run is wasted.
- **Every loss is explained with numbers.** "You lost by 4. Your partner's climb fails 40% of the time and you'd
  seen it twice. With 6417 you'd win this 68% of the time." (`games/frc-strategy/alliance.js` already computes
  match odds.)
- **Short loops, about 10–15 minutes.** Anything seen before can be skipped. Characters notice when you finish their
  sentences ("How did you know I was going to say that?").
- **Side puzzles that need knowledge from another loop**, Majora's Mask style:
  - Warn the pit crew about the battery that browns out the robot in the quarterfinals.
  - Get the scouting app's data backed up to paper before it crashes on Friday.
  - Keep the team playing until Saturday, so Grandma's glitter sign gets its moment.
- **Hints get stronger on the same event**, for both the mystery and the lesson: loop 2 a teammate's comment, loop 3
  the volunteer's nudge, loop 4 an alumnus sits down and walks through one call. A built-in difficulty adjustment.
- **Never more than one confusing reset.** The only reset that isn't explained in advance is the Event 2 twist, and
  the next loop explains it in its first minute.

---

## 9. Open questions

- **Where does a reset send you?** Proposed: Thursday of the current event, not the start of the season.
- **The council trial's season.** Which game, and whether it reuses the Showdown directly.
- **Replaying after the ending.** Should a finished save unlock a "Society archive" to replay the season with new
  rolls, for players chasing the real banner?
- **Thresholds.** How close to the best option counts as a good call (within 5 points? 10?), and the Championship
  banner odds with perfect calls.
- **Names.** The game's title, the Society's name, the team number.
