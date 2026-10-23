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
"You're up. Who do we pick? 45 seconds." You have almost no data. The full design is in section 5: short rewinds
until your calls are right, then the first long jump back, to the van on Thursday morning, as a reward.

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

They introduce themselves straight after the Event 2 twist (section 6), in the first minute of that loop, so the
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

### How far back a jump goes

Scouting is a call too. Deciding whom to ask in the van and where to send the scouts on Friday are bets, just like a
pick. So one rule covers every jump:

1. **A bad call sends you back to where you made it.** A bad pick or match call is a **rewind** of a few minutes:
   a quick retry, not a punishment. A bad scouting call (the notebook had a hole that mattered, and you could have
   filled it) is a **long jump** back to where you could have filled it. In the player's words: *if your notebook had
   a hole that mattered, you go back to fill it.*
2. **When every call was good, including scouting, the season moves on**, win or lose.
3. **Unlocking a new anchor sends you there once, as a gift**, because now there are calls you can make there. This
   happens twice in the first season: the opening (to the van) and meeting the goals at the Championship (to
   kickoff).

Holes you couldn't have reached never count against you. Before the kickoff anchor is unlocked, the robot's design
isn't your call.

The places a long jump can reach are **anchors**, earned in order:

| Anchor | What you can change there | Earned by |
|---|---|---|
| Minutes back | the call you just made | always available |
| Thursday morning, the van | what you know and who you ask; Friday's scouting plan | the opening (section 5) |
| The week before an event, the practice field | what the drive team practices | to be decided (Event 2?) |
| Kickoff, January | the robot's direction | meeting the goals at the Championship |

**How far back Norbert can reach is shown as a battery voltage.** It's the unlogged battery inside him, read on the
team's battery tester. The team rule is "under 12.5 volts, it doesn't play": at 12.4 he can only rewind minutes; at
12.9 he reaches Thursday; one day the tester reads 13.4, which no battery the team owns can do. Good calls charge it.

**The gift jump comes after the wish.** Before each one, the player sees what they couldn't know, the character
wishes out loud they'd known it, and then Norbert answers. Wanting comes first, so the jump feels like a gift.

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

## 5. The opening, in detail

### What the opening has to do

- **Be a fair fight, not a trick.** Save "you thought you won but you didn't" for Event 2, once the player trusts the
  game. The opening's message is the honest version: *you did well, and it wasn't enough.* The success is real; the
  player then sees its ceiling.
- **Every failure passes three tests.** The information to get it right was on screen. The cause shows up in one
  picture. The retry is less than a minute away.
- **The first lesson should surprise experienced students too.** "Averages don't add up" does: it's true, it's
  visual, and it's how real alliances are lost.
- **The first long jump is a reward.** You get sent to Thursday because you did everything right and there was
  more to know. A reward makes the player want to go back; a punishment makes them want to quit.

### Beat 1: Saturday 12:38 PM, alliance selection

Black screen, crowd noise. Card: **ALLIANCE SELECTION, SATURDAY 12:38 PM.** A text from the senior strategist:
*"Sick. Can't come. You've got this. Notebook's in Norbert's bag."* The captain hands you the notebook: one page,
averages and a few notes, nothing more. The captain sets the target without meaning to: "We've never made a final.
It's my last year."

You're seed 4, an alliance captain. Seeds 1 to 3 pick quickly over the MC. Then it's your turn: **45 seconds**, four
cards. (Teams and numbers are placeholders to tune.)

| Card | Notebook says | The truth |
|---|---|---|
| **Your robot** | avg 30: rocket hatches, Level 3 climb | — |
| **1690, the showpiece** | **avg 41**: rocket hatches, Level 3 climb, sandstorm | Great robot, wrong partner: it does what you do |
| **2056, the workhorse** | avg 31: cargo into the cargo ship, Level 2 climb, never broken | The best pick on what you know |
| **6417** | avg 22: "?" | Broke a chain in each of its first five matches; since the fix, avg 36. The best pick, if you knew |
| **1114, the wall** | avg 18: defense | Not yet (see pass 2) |

**The trap is that averages don't add up.** The HAB has one Level 3 platform per alliance, so two Level 3 climbers
only ever get 12 points between them, not 24. Both robots also feed hatches from the same loading station and queue
behind each other. On paper you and 1690 make 71 points; together you average about 51. You and 2056 average 61.

**It's fair** because the notebook says "Level 3 climb" on both cards, and because the top three seeds passed on a
41-point robot. The MC even says so: "Nobody's taken 1690 yet. Their loss!" A sharp player asks why.

**A wrong pick:** the quarterfinals play out quickly and you lose (dice nudged, as at Event 1). The replay shows it
in one picture: both robots drive up to the one Level 3 platform and one has nowhere to go.

> On paper: 41 + 30 = 71. Together: 51.
> 2056 would have made 61, because it scores where you don't.

Then it rewinds: "WELCOME TO ALLIANCE SELECTION! HOW ARE WE FEELING, EVERYBODY?!" The character: *"...didn't this
just happen?"* Norbert's ear glows. The second rewind, the character starts finishing the MC's lines.

### Beat 2: the quarterfinal endgame call

With 2056 picked, the quarterfinals play quickly up to one frozen moment: **20 seconds left, you lead by 7.** Your
partner can climb to Level 2 (+6, certain) or try Level 3 (+12, works half the time; if it fails, they end on Level 1
for +3). The opposing climber gets to Level 3 (+12) 60% of the time, otherwise Level 1 (+3).

- **Level 2:** a 13-point lead against at most 12. **Wins every time.**
- **Level 3:** wins 70% of the time.

Everything pushes toward Level 3: the crowd chants, the partner's driver says "We practiced it!", and 12 is a bigger
number than 6. That's the trap, and it's the Learn lesson *When the sure thing is enough, take it*. A wrong call
rewinds **only to the frozen moment**, not to selection: the pick was right, so it stays.

### Beat 3: the semifinal, played fair

The semifinal is against the #1 alliance, led by 4000, and the dice are honest. You'll almost certainly lose a close
series. Then the bet log:

> **Pick 1 ✓ · Endgame call ✓**
> With what you knew: a 34% chance of reaching the final. The best calls possible gave 34%. **100%.**

The player gets real credit: they played it perfectly. Then the notebook pages flip, and the gaps show up as "?"
entries, each with a face beside it:

- *6417: avg 22, why?* (the scout lead's portrait)
- *4000: what happens when someone defends them?* (the drive coach's portrait)
- *Our Level 3 climb: really "confident"?* (the programmer's portrait, asleep)

> If you'd known these: **58%**.

The character, quietly: *"If I'd just known..."* Norbert's ear glows. The battery tester reads 12.9 volts.

### Beat 4: the van, Thursday 6:40 AM

Norbert is in your lap. The navigator's GPS reads **ARRIVE IN 20 MIN**, and that's your timer. Every question costs
time: 1 to 4 minutes, shown on the card before you ask. There are about 25 questions in the van and room for about 7,
so one ride can't cover everything, and every reboot is a chance to learn more. The notebook keeps every answer.

You choose the seat and the direction of each conversation. Every lead knows different things:

| Lead | What matters now | What matters later | Dead ends |
|---|---|---|---|
| **Scout lead** (watched week 1 streams) | 6417 breaks early at every event, then gets good | which teams scout you back | the famous team's new auto |
| **Drive coach** | at week 1, the one time anyone defended 4000, they scored half | your drivers' nerves in elims | a swerve drive on a seed that will never be pickable |
| **Programmer** (asleep: waking them costs 3 min) | the climb logs: Level 3 is 6 out of 10, not "confident" | the unlogged battery (a Norbert clue) | |
| **Captain** (senior) | the target, and their friend on 4000: "their strategist always picks the highest average" | the seniors' story | |
| **Mentor** (driving, can't turn round) | perspective and calm | lore: "I had a strategist like you once..." | |
| **Rookie** | asks the questions the player is afraid to ask, and is a good way to teach | | |

**How you ask matters.** Ask the scout lead "Who's the best robot there?" and they say 1690, which you already know.
Ask "Who got better as their last event went on?" and they say 6417. Good scouting questions ask about change,
consistency and roles, not "best". That's a lesson students can take straight to real events.

**Some time can be won back.** On the first ride, the navigator takes the GPS's dirt-road shortcut and you arrive 3
minutes early. Next ride, say no: +3 minutes. A stop for snacks gives another 4, if you've learned on an earlier ride
that the van is low on pretzels. Knowledge from earlier loops buys time, so reboots feel like an advantage.

**Some answers don't matter.** The red herrings are interesting and change nothing. The recap after the event shows
which was which: *"You learned 2468's auto: changed nothing. You skipped the programmer: your semifinal climb call
depended on it."* That's the Learn lesson *A detail matters only if it moves an outcome across the line*, played
rather than read.

### Beat 5: Friday, short in the opening

One decision: **where your scouts' extra eyes go on Friday afternoon** (pick two teams). Hearsay from the van isn't
data. Put a scout on 6417 and the notebook confirms the trend from their matches: *last 6 matches: avg 36*. Skip it
and the card still says 22, with only the scout lead's word behind it. This teaches *write down what robots do, not
what people say*.

Qualifications run as a montage. In the opening you seed 4th again, so selection is the same puzzle with better
information (later loops re-roll the schedule; see section 2).

### Beat 6: Saturday again

- **Pick 1:** 6417, which is now visibly the best robot on the board for you.
- **Pick 2 is yours this time:** 1114, the wall, matters now because the drive coach told you 4000 struggles when
  defended.
- **The semifinal plan:** defend 4000's captain (the Showdown already models defense assignments).
- **The climb call in the semifinal** depends on what the programmer told you about the real Level 3 rate.

With the right calls, the semifinal is about 58% and nudged in your favor: **you make the final**, the team's first.
The final is played fair; you probably lose it, and that's fine. The target is met, the calls were good, and the
season moves on.

### Where each outcome sends you

| What happened | Where you go |
|---|---|
| Bad pick | Rewind to 12:38 PM, alliance selection |
| Bad endgame call | Rewind to the frozen moment, 20 seconds left |
| Every call good, semifinal lost (the opening) | Gift jump to the van, Thursday 6:40 AM |
| Pass 2: a key question skipped in the van and the target missed | Long jump to the van |
| Pass 2: a bad pick or match call | Rewind to that call |
| Pass 2: every call good | The season moves on, final won or lost |

### Why the player wants to go again

- They were told they played perfectly, and shown that perfect play wasn't enough.
- The "?" entries are a mystery with faces attached. They know exactly whom to go and ask.
- The timer means they can't learn everything, so every ride is a new plan.
- Norbert and the 12.9 volts are a second mystery running alongside.

### Building the opening: what to prepare

**1. The cold open, shot by shot, cut to the music.** The intro (`public/team-manager/intro.js`) cuts on the beat of
the music clock, and the opening should feel like it. A first pass to time and then tune:

| Shot | Seconds | What happens |
|---|---|---|
| Black | 1.5 | Crowd noise rising. No music yet. |
| Her phone, full screen | 3 | A text from the senior strategist, the typing dots first: *"Sick. Can't come. You've got this."* |
| Card | 2 | ALLIANCE SELECTION · SATURDAY 12:38 PM. The music comes in. |
| Wide, then Robin | 4 | The arena, Robin skating to the mic: "WELCOME TO ALLIANCE SELECTION!" |
| Close on the co-captain | 2, silent | The co-captain turns to her. A wordless beat with a hold, so A can't skip it. |
| The handoff | 4 | "YOU'RE UP. THE LIST IS YOURS." Then Norbert: "AND TAKE HIM. HE'S BEEN TO EVERY EVENT SINCE 2009." |
| Her | 1.5 | "...OKAY." |
| The dashboard | 45 s clock | The pick (beat 1 in section 5). |

**Pacing the words.** Short lines and real pauses. The co-captain's handoff lands best after a silent beat: let the
camera sit on the co-captain's face for two seconds before anyone speaks. One line a page, and no tutorial text in the
first minute: the 45-second clock explains itself.

**2. Norbert.** The handoff is his first appearance: given to her "for luck", so he arrives as a gift, not an
interface. After that he lives in the corner of the screen as her one inventory item:

- **The corner:** him (16x19, `public/team-manager/norbert.js`) with his battery voltage, the depth meter from
  section 4.
- **His ear glows at big calls**, before the player knows why. That's the bet log being foreshadowed.
- **Time leaves from him.** The vortex opens around her and him, never from somewhere unrelated.
- **Later:** tapping him could open the notebook, so the one thing the player can always touch is the thing that
  holds what they know.
- **Art needed:** a walker pose with Norbert under her arm (she holds a whiteboard now), and the co-captain's handoff.

**3. Time travel.** Four looks to try, on the real cut scene, in the lab: `public/team-manager/time/` (open
`team-manager/time/` on the site). Every scene draws its frames from time, so a rewind plays the real scene
backwards; the lab records each moment as it plays and draws them again in reverse.

- **STOP:** everything stops but her. The world drains to cold blue, she alone keeps her colour and looks round,
  and then the world runs backwards around her.
- **SWIRL:** a vortex around her, counterclockwise for a rewind and clockwise for forward.
- **TAPE:** a tape rewinding, with REW and a clock in the corner.
- **ALL:** STOP, then the vortex with her still and in colour at its centre, a white flash, a clock card spinning
  back to 12:38, then the world unwinds back into colour.

Proposed use:

| Jump | Look | Length |
|---|---|---|
| A gift or long jump (to the van, to kickoff) | ALL | about 6 s |
| A rewind (a few minutes back) | A short STOP: the tick, she looks round, a quick counterclockwise swirl, no clock card | under 2.5 s; it repeats, so it has to stay quick |
| Skipping ahead (Friday's montage) | SWIRL, clockwise | about 3 s |
| The very first rewind | ALL in full, so the player sees what's happening once | about 6 s |

**4. The scouting dashboard.** It's the screen the player spends the opening on, so it has to be the nicest thing in
the game. A sketch to mock up next:

- **Where:** on the phone in single-device play, and as a full-screen pixel overlay on the big screen. It's built
  like a real scouting app on a tablet.
- **Your robot pinned at the top**, as a card like every other. A careful player compares chips straight down.
- **One card per pickable team:**
  - the team number and name;
  - the **average, big**: the tempting number;
  - **chips** for what it scores (ROCKET HATCH, CARGO SHIP, L3 CLIMB, DEFENSE);
  - a **sparkline of every qualification match**, so consistency and trends show without a lecture. 6417's line
    jumps after match 5; that's the whole lesson in one picture, once you have the data;
  - **"?" entries**, each with the face of the person who knows.
- **The pick clock**, 45 seconds, big and red as it runs down.
- **Friendly:** big touch targets, one tap to compare two teams side by side (the "71 on paper" sum appears there),
  no menus.

**5. The rest of the art and code.**

- **The co-captain:** a new character on the walker rig.
- **Her phone's text screen:** for the cold open.
- **The quarterfinal replay shot:** two robots and one Level 3 platform, on the arena's field (`field.js`).
- **The van conversation picker with the GPS timer:** the van scene already picks people by seat.
- **The recorder in `stage.js`:** the lab's rewind recorder, moved into `stage.js` so any scene can rewind. That
  file is shared by every scene, so agree it with whoever's working on the scenes.
- **The numbers:** the selection puzzle's averages and odds, tuned in `games/frc-strategy/alliance.js`'s model.

---

## 6. Banners

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

**The first time through, meeting the Championship's goals unlocks kickoff.** Norbert's tester reads 13.4 volts and
the gift jump goes all the way back to January. Now the robot's direction is your call, with a whole season of
notebook behind it, and there's a path to the world title. In the first season that path follows how 5026 actually
won it, and the scales are tipped towards the player.

Tip them honestly where possible: make the robot-direction calls raise the **true** odds (a better robot, the right
partners), so the 5–10% becomes something like 40% because of what the player did. If the dice still need help,
nudge only the final roll, and only when every call was right. The second visit to the Championship is the one-shot
below.

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

- Rig outcomes only in the scripted moments: the gentle nudge at Event 1 (including the opening), the forced banner
  at Event 2, the one "right call, lost anyway" beat (section 7), and at most the final roll of the second
  Championship.
- **Never misstate the odds.** The game may choose which roll happens; the numbers it shows are always the true ones.
- Everywhere else the dice are fair.

---

## 7. The season: each event teaches one lesson, and the next flips it

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
wrong answer, how the failure reveals it, and its hint ladder (section 9).

**The "right call, lost anyway" beat:** script it once, after the rule is known, somewhere low-stakes (a
qualification match, or a semifinal at Event 3). The bet log shows all ✓ next to an L and the season moves on.

---

## 8. What you do each loop

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

## 9. Making failure enjoyable

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

## 10. Open questions

- **5026's real path to the 2019 title.** Who picked whom, what the robot's role was, and the key moments, so the
  first season's road to the world title can follow it.
- **The opening's numbers.** The averages, climb rates and odds in section 5 are placeholders. Check them against
  the 2019 manual and tune them with the match model in `games/frc-strategy/alliance.js`.
- **The practice-field anchor.** When it unlocks, and what the drive team can practice there.
- **The council trial's season.** Which game, and whether it reuses the Showdown directly.
- **Replaying after the ending.** Should a finished save unlock a "Society archive" to replay the season with new
  rolls, for players chasing the real banner?
- **Thresholds.** How close to the best option counts as a good call (within 5 points? 10?), and the Championship
  banner odds with perfect calls.
- **Names.** The game's title, the Society's name, the team number.
