# Blue Banner: story and game design

**Status:** the first event is built and plays from the title screen to the end of its boss fight
(`public/team-manager/game/`, run by `play.html`). Section 11 says what's there and how it works, and section 12 lists
the lessons and where each one lives in it. Sections 1 to 10 are the design notes it grew from: where they and the
game differ, the game follows section 0, the direction, and section 11 says so. The scenes beside `game/` (the team
meeting, the practice field, the old pits, Worlds) are the earlier proofs of the engine; their story and dialogue are
filler, not canon.

**Fixed so far:** there's one main character, a new member of the strategy team; the game trains scouting and match
strategy; it starts in the 2019 season (Deep Space), though any season would work.

**The goal:** train new strategy team members. But first and foremost it has to be a game people enjoy, including
the parts where they fail and try again.

---

## 0. Direction: the feeling we're after

The built opening (two picks and the quarterfinal, section 5) plays like a quiz. Each decision is a framed choice with
the facts that matter placed on one screen, graded on the spot with a stamp and a lesson line. The feeling to aim for
is the first Pokémon games instead: exploring, wanting to be the very best, a story underneath, and cool tools to
explore with. Here that means:

- **Boss fights** are alliance selection and the playoffs at each event. The rewind stays here: like a gym leader,
  you try again until your calls are excellent.
- **Wild battles** are the qualification matches, about ten an event. Make the plan (who scores where, who defends
  whom, whether to climb), then watch it play out on a real match simulation. No rewinds: this is where you try
  moves and see what they do.
- **Things stop working.** Each event changes what works (section 7), so the trick that won Event 1 fails at Event 2,
  and you have to work out a new one.
- **Learn by playing.** No lesson lines. Facts are just true in the world, and you find them by watching matches,
  visiting pits and asking people. Characters react in character; they don't grade.
- **In deeper.** Whole events (24 to 36 teams, a real schedule), not two or three handpicked cards. A thinker's
  game is fine.
- **Tools you earn**, like the bike: a clipboard, then the scouting app, match video, heat maps of where robots
  score, a pick list builder, an odds calculator.
- **The notebook is the Pokédex**: an entry for every robot, filled in from what you saw.
- **The story underneath:** a rival strategist (another team's rookie, who started the same day and is always a step
  ahead), Norbert's mystery and the alumni.
- **Showing you're good**, against yourself and other people:
  - a trainer card: a strategist rank, a badge per event, best event score, robots scouted, a qualification record;
  - battles against friends in the Showdown (Strategy Training's multiplayer, on Game Night's big screen and phones);
  - later, the same event with the same rolls for everyone, and scores to compare (that needs somewhere to keep
    scores: the website has no server).

**Still open:** the hook. Riley's last season, Grandma's glitter sign and an older sibling on the 2014 team were
considered and set aside. Also open: the rival's design, whether the bet log's grades show before the alumni twist,
and how the time loop sits with a journey that goes forward.

**Built:** the first event, to this direction (section 11). **Next:** the things section 11 lists as not there yet,
then Event 2, where what worked stops working (section 7).

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
- An old label is stitched inside his bow: *"Property of 26, Class of 2015."* (The team started in 2014, so its first class graduated in 2015.)
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

> **As built, the opening is freer than this section.** The first version was built to the beats below and played
> like a quiz: two cards, one right answer, a stamp, and a rewind until she got it. It's been rebuilt (section 11):
> the same cut scene, then a real alliance selection with every team on the tablet and a real playoff with whoever
> she picked. Nothing grades her and nothing rewinds; the gift jump to Thursday comes whatever happened. The beats
> below are kept for the thinking in them (what makes a failure fair, why the first jump is a reward) and for the
> parts that aren't built yet (the van's timer, the "?" entries with faces).

### What the opening has to do

- **Be a fair fight, not a trick.** Save "you thought you won but you didn't" for Event 2, once the player trusts the
  game. The opening's message is the honest version: *you did well, and it wasn't enough.* The success is real; the
  player then sees its ceiling.
- **Every failure passes three tests.** The information to get it right was on screen. The cause shows up in one
  picture. The retry is less than a minute away.
- **The first lesson should surprise experienced students too.** "The average hides which way a robot is going"
  does: it's true, it's visible in the last four boxes, and it's how real alliances are lost.
- **The first long jump is a reward.** You get sent to Thursday because you did everything right and there was
  more to know. A reward makes the player want to go back; a punishment makes them want to quit.

### Beat 1: Saturday 12:38 PM, alliance selection

Black screen, crowd noise. Card: **ALLIANCE SELECTION, SATURDAY 12:38 PM.** A text from the senior strategist:
*"Sick. Can't come. You've got this. Notebook's in Norbert's bag."* The captain hands you the notebook: one page,
averages and a few notes, nothing more. The captain sets the target without meaning to: "We've never made a final.
It's my last year."

You're seed 4, an alliance captain. Seeds 1 to 3 pick quickly over the MC. Then it's your turn: **45 seconds** on the
scouting tablet, with your robot pinned at the top for reference and two cards to choose from. Each card shows the team
number, its average (big), one short note and its ten qualification matches as a strip of boxes: seven on Friday, three
on Saturday morning. The trend is in the last four: Friday's last match and Saturday's three. The team numbers are made
up.

| Card | The tablet says | The truth |
|---|---|---|
| **Your robot, 5026** | avg 30 | — |
| **7461** | **avg 38**, the biggest number on the screen; "BIG. FAST. LOUD FANS." 45, 42, 47, 43, 41, 46, then **31 · 27, 30, 28** | Fading: 44 a match for its first six, 29 for its last four, about two thirds of it. Something broke on Friday afternoon, and it hasn't been fixed. |
| **6834** | avg 35; "REBUILT INTAKE FRIDAY." 26, 28, 27, 29, 26, 26, then **47 · 49, 48, 48** | Rising: 27 for its first six, then a rebuilt intake, and 48 a match since, about 10% better than 7461 at its best. The right pick. |

**The trap is that the average hides the trend.** The senior strategist's page is from Friday night, when 7461 really
was the best robot at the event. In its last match on Friday it started limping, and an average over all ten matches
still puts it on top, 38 to 35.

**It's fair** because the last four boxes are on screen, the other card says what changed, and the three seeds above
you passed on the bigger average. A sharp player asks why.

**After the pick:** "6834 ACCEPTS!" (or 7461), then the bet log's stamp, GOOD CALL or BAD CALL, with one picture and
one line. The picture is 7461's strip (and, for the right pick, 6834's over it), the last four boxes lighting up, red
for 7461 and green for 6834:

> FIRST 6 44 · LAST 4 29
>
> **Look at the trend, not the average.**

A wrong pick rewinds to the start of the pick clock, Norbert's 26 ear glowing in the corner, and she thinks:
*"...didn't this just happen?"* A right pick goes on to the second pick (beat 1b, below). Not built yet: a wrong
pick's quarterfinals played out and lost before the rewind, and the rewind's time-travel look ("Building the opening",
part 3).

**Why not "averages don't add up"?** The first version of this puzzle had 7461 and your robot both climbing to Level 3
and feeding from the same loading station, so the pair would score far less than the sum of their averages. The 2019
rules don't support that: the second climber still gets Level 2 (6 points), and each alliance has two loading stations,
so the overlap costs about 6 points, not 20. Students who know Deep Space would call the trap unfair. A robot that's
fading (or rising) while its average stands still is just as real a scouting mistake, and the evidence is right there
on the card. (A second version had 7461 sit dead on Saturday, its boxes left blank and skipped by the average; it was
too easy to miss, and the trend reads more clearly.)

(The two-card tablet was built to this and has been replaced: section 11. The page it showed is now the whole event's,
`game/cold-data.js`.)

### Beat 1b: the second pick

6834 accepts, and selection isn't over: the second robot is hers to pick when the order comes back up the line. The
player is thrown in the deep end, so the goal is made plain and kept on screen.

**The goal.** The tablet turns to a dashboard of the whole selection: the eight alliances, 1 to 3 with their first
picks and hers with 6834 just in. Her **goal card** slides in, the whiteboard checklist from section 4, in its first
use:

> ✓ FIRST PICK: 6834
> ▶ SECOND PICK: ? (to beat alliance 5)
> ○ WIN THE QUARTERFINAL (best 2 of 3)

Riley says it in two lines: the quarterfinal is alliance 4 against alliance 5, best 2 of 3; alliance 5 has 7777, the
top scorer at the event, and they pick before we do. She answers: *"Then we pick to beat alliance 5. Not just the
biggest number left."* The card then folds into a pill in the dashboard's header (GOAL: SECOND PICK TO BEAT ALLIANCE
5), which a tap opens again.

**The wait, about 33 seconds.** Round 1 finishes (alliances 5, 6, 7, 8) and round 2 runs back up (8, 7, 6, 5), one
pick every four seconds: MC Robin's call on a slim PA line, the pick going into its row, and its tile on her list
stamped TAKEN BY ALLIANCE n and dropping away. She can browse every card, but can't invite anyone, and can't hurry
it: the picks are the event's, and they're the clue. Alliance 5 is built to score cargo:

| Alliance 5 | Role | Avg |
|---|---|---|
| **7777**, captain | cargo | **46**, the top scorer at the event |
| 6417, first pick | cargo | 36 |
| 7311, second pick | hatch | 20 |

The others take 7461 (the fading one from the first pick), 6038, 6612, 8248, 9785 and 6017.

**Her turn: 45 seconds, three teams left.**

| Card | The tablet says | The truth |
|---|---|---|
| **2202** | **avg 27**, the biggest average left; "CARGO. 27 A MATCH. STEADY." | The trap. It adds 27: 105 to alliance 5's 102, a coin flip each match, with nobody stopping 7777. |
| **5518** | avg 20; "GOES FOR LEVEL 3 EVERY MATCH." "MADE THE L3 CLIMB 2 TIMES IN 7." (two big boxes) | 98 to 102, and only if the climb works. |
| **4471** | avg 14, the smallest on the screen; "DEFENSE. QUICK. HARD TO PUSH." "Q23: ON 7777. HELD IT TO 22." (that match outlined) | The right pick. Its own points are few because it spends its matches on defense. On 7777 it takes 24 off their star: 92 to 78. |

The sums are the scouting app's: each robot's average, added up, counting 6834 at 48 (its last four: the first pick's
lesson carries over) and her robot at 30.

**It's fair** because everything is on screen: the goal says *to beat alliance 5*, Riley names 7777, the opponent box
marks 7777's 46 as the best at the event, and 4471's card says what it did to 7777. **It's real**, not a trick: in
2019 the third robot on an alliance often played defense, and a defender on the other side's top scorer is a standard
quarterfinal plan. Students who know the game will recognize it.

**After the pick:** INVITE or BACK, "4471 ACCEPTS!", then the bet log for PICK 2, GOOD CALL or BAD CALL, and one
picture: the quarterfinal as two bars, her alliance in red and alliance 5 in blue, each robot a block as long as its
average. With 4471, 7777's block shrinks from 46 to 22 and the blue bar with it.

> **Pick for the matchup, not the list.**

A wrong pick rewinds **only to her turn on the clock**, not to the start of selection: the first pick was right and
the picks before hers were never hers. Norbert's ear glows, and she thinks *"...didn't this just happen?"* The right
pick ticks the card's second line (✓ ✓ ○): PICKS DONE, and A goes on to the quarterfinal, best 2 of 3 against
alliance 5 (beat 2).

(Built to this, and replaced: section 11. The second pick is now just her second pick, with whoever's left.)

### Beat 2: the quarterfinal endgame call

With 6834 picked, the quarterfinals play quickly up to one frozen moment: **20 seconds left, you lead by 7.** Your
partner can climb to Level 2 (+6, certain) or try Level 3 (+12, works half the time; if it fails, they end on Level 1
for +3). The opposing climber gets to Level 3 (+12) 60% of the time, otherwise Level 1 (+3).

- **Level 2:** a 13-point lead against at most 12. **Wins every time.**
- **Level 3:** wins 70% of the time.

Everything pushes toward Level 3: the crowd chants, the partner's driver says "We practiced it!", and 12 is a bigger
number than 6. That's the trap, and it's the Learn lesson *When the sure thing is enough, take it*. A wrong call
rewinds **only to the frozen moment**, not to selection: the pick was right, so it stays.

**As first built** (and since replaced by the playoffs of section 11, where every match is still the simulation's
but nothing is chosen for the story): the series against alliance 5,
best 2 of 3, with alliance 4 (hers) as red, the higher seed. Every match is the match simulation's
(`public/team-manager/match/`), so what's on the field is what scores. The story chooses each alliance's plan and
each match's seed, and `test/match-sim.mjs` checks the matches still go its way.

- **The series card:** QUARTERFINAL, BEST 2 OF 3, the two alliances side by side with each robot's job.
- **Match 1, about 10 seconds** (the match at 15 times speed, the camera on the action): 4471 defends 7777 all match.
  Red wins 105 to 99, and 7777 scores 29. The second pick paying off.
- **Match 2:** the same plans, but 6834's battery browns out at 1:12 and it's dead on the field, the line under the
  picture turning red as it happens. Blue wins 82 to 77. A loose battery, nothing she could have seen; it's a clue for
  the van to find on a later run (section 9). 1-1.
- **Match 3** slows down as it nears 0:20 and freezes there: a flash, the field going dark, red up 94 to 86. Everyone
  but the two climbers has gone home early, so every point left is 6834's climb and 6417's. Riley on the headset
  ("6834 has to climb. Your call."), 6834's driver ("Let us go for Level 3! We practiced it all week!"), and Riley
  again: 6417 is going for Level 3 too.
- **The call:** two cards over the frozen field. LEVEL 2, +6, made 10 of 10. LEVEL 3, +12, made 5 of 10, a miss is
  Level 1, +3. Under them, blue's 6417: Level 3, +12, made 6 of 10, a miss is Level 1, +3. The crowd chants LEVEL
  THREE and 6834's driver says they practiced it. No clock: time's stopped. Tap a card, or the stick and A.
- **The last 20 seconds**, nearly real time, played out on the field as the call and the dice went: the camera on 6834
  as it drives home and climbs, then across the field to 6417, whose Level 3 settles at the buzzer. The dice are
  honest, rolled as she calls (`?climb=made|missed` and `?theirs=made|missed` fix them for testing). Match 3 is
  simulated once for each way it can go, identical up to the freeze.
- **The buzzer:** the final score and the series won or lost, then the bet log for the call: ten replays of the last
  20 seconds for each call as boxes, LEVEL 2 winning 10 of 10 and LEVEL 3 7 of 10, the sum that settles it ("Up 8,
  plus 6 from Level 2: up 14. They can add 12 at most."), and *When the sure thing is enough, take it.* A Level 3
  call is a BAD CALL even when it works ("It held this time. 3 times in 10, it doesn't."), and rewinds to the call.
- **The end:** the goal card with all three ticked, and TO BE CONTINUED: the semifinal against alliance 1 (beat 3),
  with the bet log's PICK 1, PICK 2 and ENDGAME ticked.


### Beat 3: the semifinal, played fair

The semifinal is against the #1 alliance, led by 4000, and the dice are honest. You'll almost certainly lose a close
series. Then the bet log:

> **Pick 1 ✓ · Endgame call ✓**
> With what you knew: a 34% chance of reaching the final. The best calls possible gave 34%. **100%.**

The player gets real credit: they played it perfectly. Then the notebook pages flip, and the gaps show up as "?"
entries, each with a face beside it. (6417, the sleeper, isn't on the opening's tablet yet; it joins the board once
there's a van to learn about it in.)

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

**How you ask matters.** Ask the scout lead "Who's the best robot there?" and they say 7461, which you already know.
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
- **Pick 2 is yours this time:** 8724, the wall, matters now because the drive coach told you 4000 struggles when
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
| The handoff | 4 | "YOU'RE UP. THE LIST IS YOURS." Then Norbert: "AND TAKE HIM. HE'S BEEN TO EVERY EVENT SINCE 2014." |
| Her | 1.5 | "...OKAY." |
| The dashboard | 45 s clock | The pick (beat 1 in section 5). |

**Pacing the words.** Short lines and real pauses. The co-captain's handoff lands best after a silent beat: let the
camera sit on the co-captain's face for two seconds before anyone speaks. One line a page, and no tutorial text in the
first minute: the 45-second clock explains itself. Until Robin calls her up, the player sets the pace: every line, and
the texts on her phone, wait for A. The call is where the hurry starts: from "5026, COME ON UP!" the words turn by
themselves and the 45-second clock is running, ticking softly every second and louder for the last ten. The other
scenes (the team meeting, the practice field, the van, alliance selection) still turn some of their cut scenes' lines by
themselves; if they go into the game, their lines should wait for A the same way, wherever there's no clock running.

**2. Norbert.** The handoff is his first appearance: given to her "for luck", so he arrives as a gift, not an
interface. After that he lives in the corner of the screen as her one inventory item:

- **The corner:** him (16x19, `public/team-manager/norbert.js`) with his battery voltage, the depth meter from
  section 4.
- **His ear glows at big calls**, before the player knows why. That's the bet log being foreshadowed.
- **Time leaves from him.** The vortex opens around her and him, never from somewhere unrelated.
- **Later:** tapping him could open the notebook, so the one thing the player can always touch is the thing that
  holds what they know.
- **Art needed:** a walker pose with Norbert under her arm (she holds a whiteboard now), and the co-captain's handoff.

**3. Time travel.** Six looks to try, on the real cut scene, in the lab: `public/team-manager/time/` (open
`team-manager/time/` on the site). Every scene draws its frames from time, so a rewind plays the real scene
backwards; the lab records each moment as it plays and draws them again in reverse.

Four are effects any game could use:

- **STOP:** everything stops but her. The world drains to cold blue, she alone keeps her colour and looks round,
  and then the world runs backwards around her.
- **SWIRL:** a vortex around her, counterclockwise for a rewind and clockwise for forward.
- **TAPE:** a tape rewinding, with REW and a clock in the corner.
- **ALL:** STOP, then the vortex, a white flash and a clock card spinning back to 12:38.

Two come from this game's own world:

- **WIND: Norbert is clockwork.** Everything stops, Norbert hops out of his corner (twice his size, in front of the
  picture), turns his back, and a brass wind-up key pops out. It turns counterclockwise one click at a time, each
  click ratcheting the world back a step, faster and faster, until it spins free. Forward winds it clockwise. Then he
  hops home. This makes the lore visible: the alumni's time machine is a key inside the team mascot. The hints can
  point to it: a zip tie holding a seam shut on his back; a clicking sound when someone squeezes him.
- **NOTEBOOK:** the stopped moment shrinks onto a page of her scouting notebook as a pencil sketch, her still in
  colour, and the pages flip back through earlier moments, each with its time. She writes BACK TO 12:38 in red, and
  the last sketch fills the screen. The notebook is what survives every loop.

Proposed use, one look per kind of jump so the player learns to read them:

| Jump | Look | Why |
|---|---|---|
| A rewind (a bad call, minutes back) | Norbert turns a small key in his corner: three clicks, no hop, under 2 s | It repeats, so it has to be quick; the clicks still say "Norbert did this" |
| A long jump (a hole in the notebook) | NOTEBOOK, flipping back to the page with the hole | You go back to fill a gap in your notes, so you travel through your notes |
| A gift jump (to the van, to kickoff) | WIND in full | The big moments get Norbert's whole performance |
| Skipping ahead (Friday's montage) | NOTEBOOK forward: pages filling with tallies as they flip | Quals are scouting; the notebook fills up |
| The very first rewind | WIND in full | So the player sees once, clearly, who is doing this |

**Feedback on WIND (from the owner):** the wind-up motion is liked, but it was slow to ramp up and get where it's
going. The lab now winds faster: the first click comes at once, the clicks speed up quicker, and the whole look is
about 4.2 seconds instead of 6.5. Keep the full performance short; the clicks should feel urgent.

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

---

## 11. What's built: the first event

The game runs from the title screen to the end of the first event's boss fight: about forty minutes the first time
through. `game/main.js` tells it from top to bottom. What follows is what's there, and the handful of rules that make
it a game.

### The shape

| Part | What happens | Whose it is |
| --- | --- | --- |
| The opening reel and title | As before. NEW SEASON asks her name; CONTINUE carries on a save. | — |
| **The opening**, Saturday 12:38 PM | The cut scene as it was: the text, Riley, the list, Norbert, Robin's call. Then alliance selection **for real**: the senior strategist's page on the tablet, every team that's left, 45 seconds a pick. Then the playoffs with whoever she got. | Hers. She can invite anyone, a captain below her included (7777 says no). The picks stand. The first playoff match is on the drive coach's plan, so the first thing she's asked is the climb call at 0:30; from the second match the plan is hers too. |
| After | Wherever it ended, Riley and her on the floor, five pages: how far they got, "I picked 7461 without ever seeing it play", Riley's last season, "If I had the whole weekend again...". Norbert's key turns, and his reading runs down from 12.4V to 12.0V as it does. | The wish comes first, then the gift (section 4). |
| **Thursday** | The van: two pages, then her notebook open in her hands on 23 blank tiles, asking WHO DO I WATCH FIRST? She circles one, and says so. Then the pits at load-in, with a marker on that robot's pit. | Hers: which robot first (three tiles carry a word from her Saturday, but any will do), which pits to visit. |
| **Friday and Saturday morning** | Ten rounds of qualification. Each round: the arena or the pits, as she likes, for as long as the round's time lasts; then her own match. Round 1 is guided once (the stands for the robot she circled, the notebook, her match), then she's let go. | Hers: who to watch, who to ask, the plan for her alliance, the call at 0:30. Nothing can be taken back. |
| **The boss fight**, Saturday 12:38 PM again | Alliance selection with the event's real rankings and her own notebook on the tablet; then the playoffs, best two of three, as far as she gets. | Hers. If she seeded in the top eight (or moved up), both picks. If another captain picked her first, that captain hands her the second pick. If she's out and Norbert has the charge, she can wind back to selection, or let it stand. |
| The end | The event on a card: record, seed, alliance, how far it went and how far it went on one page, robots watched, field notes found. | — |

### The rules that make it a game

- **Every match is the simulation's** (`match/sim.js`), in the opening, the qualification rounds and the playoffs.
  The event (`game/event.js`) is 24 teams, a schedule and dice from a seed. The robots are what they are
  (`match/robots.js`); nothing is chosen to make a point. The other 30 matches are played whether she watches or not.
- **Time is the thing she hasn't got.** A round gives her three pips. Watching a match from the stands takes two and
  writes down the robot she kept her eyes on (two robots from Friday lunch, when her teammate sits with her: the
  first tool earned). Asking a pit takes one. Her own matches give her a line on all six robots, because she was down
  there. So by Saturday the notebook has about a quarter of the event in it, and which quarter was up to her.
- **The plan** (`plan.js`): each of her alliance's three robots scores anywhere, keeps to the rockets, keeps to the
  cargo ship, or spends the match on one of the other side's robots (one defender at a time: G9). A robot that
  handles both pieces can be kept to one. Each starts on its own drive team's habit, so A straight through is a plan.
- **The call** (`watch.js`): every match of hers stops at 0:30. Each robot parks, climbs to Level 2 or tries Level 3,
  and beside each choice is what she knows: for her own robot, its practice record; for anyone else, only what she's
  seen it make. The match is the same up to 0:30 whatever she calls (`event.js` sees that nobody heads home earlier),
  so it's a real call, and the last thirty seconds play out as she made it.
- **The guided start** (`guide.js`): from the van to her first match, the game walks her once round the loop it's
  about, then lets go. The robot she circles in the van (`st.book.circled`, a red pencil ring, not a star: it stays off
  her pick list) is the thread: A circles the tile the cursor's on; a finger picks a tile, then circles it with a
  second tap or the CIRCLE button under the tiles, so a tap just to look doesn't choose. One yellow marker at a time
  (`hud.js` `pointer`, `edgePointer`, `cornerMark`; its words on an ink tag) points at its pit on Thursday (then the
  way out to Friday, for whenever she's done: the time left is hers), the stands for its match in round 1 (Dani's
  picker opens on it), Norbert once it's in the notebook (a frame round his corner; the first time the notebook opens,
  the tiles she's seen ink in), then Priya for her own match (whose A comes up from the end of the walkway while she's
  marked, the way past her being out to the pits). A tap on a marker walks her there. Each one ends when she's done that thing or walked past it; there are none after her first match, but the
  notebook's, and none at all after her second. Which marker shows is worked out from the save every frame, so a reload
  can't leave one stuck. Nothing is forced and nothing is graded: the only things she has to do are read and circle.
  At the season's first field note, his reading rises (+0.1V) and she says the one line that makes the quest hers:
  "FIND OUT ENOUGH, AND MAYBE HE CAN TAKE ME BACK AGAIN." It's true (below). From the last buzzer of the opening to the
  let-go, she reads about 210 words; the van alone used to be 270. `test/blue-banner-game.mjs` holds the budget.
- **The notebook** (`book.js`) is the Pokédex: a tile a team; a page a team with the event's public numbers (rank,
  record), then WHAT I'VE SEEN (its ten matches, a number in each she watched, a dotted box for each she didn't) and,
  apart and in pencil, WHAT THEY SAY. A star puts a robot on her list.
- **The pits** (`pitrow.js`, `pit-words.js`): 24 pits, a robot on a cart in each, so its kind is plain before
  anyone speaks. Three questions: what does it do, how's it running, seen anyone good. A team is straight, proud or
  modest about itself, and what it says is made from the robot as it is that day. What it says about other robots
  comes from the matches it's really played.
- **Field notes** (`state.js` `NOTES`) are how a lesson is recorded without being taught. Each is something true at
  this event, found when what's in her notebook shows it, and written in her hand with the numbers she saw: *7461:
  42, 41 and 47 early on. 38, 30 and 29 since. Something broke.* Thirteen to find. The ones she hasn't found sit in
  the notebook as questions. Nobody says what to do about any of them.
- **Norbert's battery** is the retry. Every field note charges it a tenth of a volt (his reading goes up as the note's
  slip comes in, +0.1V rising off it); winding back to alliance selection costs three tenths and needs 12.3, and every
  wind shows what it costs, his reading running down as the key turns. The first wind takes him from 12.4V to 12.0V. So
  what she found out is what buys another go at the boss, and with nothing found there's no rewind at all. The notebook
  comes back with her; the dice don't.
- **The other captains** pick by their own eyes (`event.js` `eyeOf`): most by the average, some by the last few
  matches, a couple for fit. 7777's scout, Juno, misses nothing: she's the rival, and her alliance is usually the
  one to beat. A captain who's invited can say no.
- **One thing is scripted:** 6834's battery strap, which lets go in its alliance's second quarterfinal match unless
  someone tells its pit crew on Saturday. Whoever has 6834 has that coming. Telling them is hers to do or not.

### Where it differs from sections 1 to 10, and why

- **No bet log, no stamps, no lesson lines.** Section 0 asked for it; the field notes take their place.
- **The rewind isn't forced and isn't free.** Bad calls don't reset anything. The one long jump is the gift after the
  opening; after that a rewind is a choice she pays for with what she's found.
- **The opening's picks aren't a puzzle with an answer.** The page still has everything on it (7461's last four,
  6834's, the match 4471 held 7777 to 22), and a sharp player can still read it in 45 seconds. Most won't, and the
  playoffs that follow are with the alliance they built.
- **The hook** (section 0, still open) is, for now, Riley: it's her last season, and the team has never made a final.

### Not there yet

- The van's timer and its 25 questions (section 5, beat 4): the van is a short ride and one choice. The facts its
  people used to say (ranking points, the cargo rule, the climb odds) are where playing finds them: Mr. Adeyemi in
  the stands, the plan screen, the call, the matches themselves.
- Scouts she assigns, the pick list builder beyond a star, match video, heat maps, an odds calculator.
- Other alliances planning against her from what they've scouted (they plan from the whole event's numbers).
- The practice field and the team meeting as places in the loop; the alumni, beyond Dani's one line and Sam's.
- A walk-in to alliance selection's arena for the boss fight: it's on the tablet, as in the opening.
- Event 2.

### Trying it

`npm run site`, then `/team-manager/` (or the preview artifact). From the address bar, `play.html?at=after` (with
`&reached=sf`, `f` or `won` for the other endings), `?at=van`, `?at=thursday`, `?at=quals&round=6`, `?at=boss` and
`?at=end` start a season part of the way in, its earlier matches played on the drive coach's plans; `?seed=N` fixes
the schedule and dice; `?new` starts over; `&guide=off` plays a new season without the guided start's markers. `test/blue-banner-game.mjs` plays
whole events in Node and checks, among other things, that what the field notes say is true.

---

## 12. The lessons, and where they live

Gathered from Strategy Training's own lesson (`games/frc-strategy/lesson1-*.js`: "Winning isn't the same as scoring
more"), its Showdown, and the strategy most FRC teams teach their scouts. The rule for putting one in the game: make
it **true in the world**, give the player a **way to see it**, and let a **field note** record that they did. The
last column is the tempting wrong answer the world lets them try.

### In the first event

| Lesson | What's true in the world | Where she meets it | Field note | The tempting wrong answer |
| --- | --- | --- | --- | --- |
| Look at where a robot's going, not its average | 7461's intake breaks in its seventh match (44 a match, then 29); 6834 rebuilds its own the same afternoon (27, then 48). 3000 re-rigs its climber at Friday lunch. | The opening's page (the last four boxes). Watching either before and after. Their pits on Friday afternoon: 7461's crew round the intake saying it's fine; 6834 swapping theirs. | FADING, ON THE RISE | The biggest number on the page. Most captains take it. |
| Write down what robots do, not what teams say | Pits are straight, proud or modest. 5518 says Level 3 every match and makes about three in ten. 4471 says it mostly gets in the way. | Any pit, then the stands. The notebook keeps the two apart. The guided start does it once, in that order: her circled robot's pit on Thursday, then the stands on Friday. | WHAT THEY SAY | Filling the notebook from the pits, which costs half the time. |
| One match is a sample | Robots that haven't changed still swing fifteen points match to match. | Watching the same robot twice. Her own ten matches. | ONE MATCH | A pick list made from one great match each. |
| Averages don't add up; roles do | Cargo only stays in behind a hatch panel, and the bays run out. Three cargo robots score about 80 together and 115 apart. A cargo robot beside two hatch robots scores more than it does anywhere else. | Her own matches: the schedule gives her alliances that fit and alliances that don't. A robot sitting still for a minute is hard to miss. | NOWHERE LEFT TO SCORE | Picking the three biggest scorers. |
| Defense pays when it takes more than it costs | 4471 on 7777 takes about 21 off it and gives up 7. A cargo arm on 7777 takes 4 and gives up 13. | The plan: she can put any robot on anyone, and see. Pits that were sat on say so. | THE WALL, DEFENSE COSTS | Defense as a thing weak robots do; or as a thing everyone should do. |
| Pick the target that gives way | The same wall takes 3 off 6417. Light, fast robots (7777, 4000) give way; heavy ones don't. | The same, against different robots. | (in DEFENSE COSTS) | Defending their best robot whoever it is. |
| Robots break, and some break often | 8812 drops off the field about one match in five; 9152 browns out when pushed; anyone can die once. | Watching; pits that are straight about it; a pit with someone kneeling at the cart. | ROBOTS BREAK | A robot's good matches. In a best of three, one dead match is usually the series. |
| When the sure thing is enough, take it | Level 2 is nearly certain; Level 3 is 12 points at the robot's own odds, and a slip is 3. | The call at 0:30, with the lead on the screen. | THE SURE THING | Level 3, because 12 is more than 6. |
| Behind, the safe plan is the long shot | The same numbers, from the other side. | The call at 0:30 when she's down. | NOTHING TO LOSE | Level 2, because it never misses. |
| The objective decides: ranking points, not wins, seed you | 2 for a win, 1 for a whole rocket, 1 for 15 on the HAB. Two Level 2s and a park are 15 without anyone gambling. Rockets-only plans fill a rocket about twice as often. | The plan (ROCKETS ONLY), the call (the HAB sum is on the screen), the rankings page, the mentor. | A LOSS THAT PAYS, A WHOLE ROCKET | Playing every match to win it. |
| Who'll be gone by your pick | Captains above her take who they want; Juno takes the robot that's best now. A captain can refuse. | Alliance selection, twice. A starred robot going before her pick. | GONE BY OUR PICK | A list one name long. |
| Pick for the matchup, not the list | Her quarterfinal opponent is on the tablet while she picks, and round two comes back up the order. | Her second pick. | — | The biggest number left. |
| Ask about change and about others | A pit's "how's it running" changes by the day; "seen anyone good" is where the sleepers are named, by the teams they beat. | The pits' three questions. | — | "What does your robot do?", the one question every pit rounds up. |
| Gracious professionalism | 6834's strap will go in the playoffs. She can tell them, even if they might be on the other side. | 6834's pit on Saturday. | — | — |

### For later events (not in the game yet)

| Lesson (Strategy Training's words where it has them) | An event that could hold it |
| --- | --- |
| "Favorite: cut risk. Underdog: add risk." as a whole event's shape | Event 2, seeded low: the consistent pick that won Event 1 can't beat the top alliance. Then the Championship as favorite. |
| "A plan the other side can predict gets its worst-case number." Mixing plans when they adapt | An event where the other alliances scout her: their coaches plan from her last three matches. |
| "Links hurt 'at least one' goals and help 'all of them' goals": shared causes | Two climbers that both need the same platform; two robots fed by one loading station; an alliance that all browns out on the same carpet seam. |
| "A small sample gives a range, not a number." The add-one rule | The odds calculator, as a tool earned: it shows a range that narrows as she watches more. |
| "A rate is only as good as the conditions it was measured in." | Robots whose numbers came from undefended matches, in an event where everyone defends. |
| "Know which assumption flips your decision." | A plan screen that says which one thing would change the call, once she's found enough notes. |
| "Judge the decision by its odds." | The alumni's bet log (section 4), after the twist: by then she's earned being graded. |
| A series against a team that breaks down vs. one that's just unlucky | The playoffs at Event 2: a shared failure across a series isn't a fresh lottery each match. |
| Scouting your own alliance: what your drive team can really do | The practice field anchor: what they practise is a call too. |
| Robot design as strategy: "do three things at ten out of ten, not five at six" | Kickoff, the last anchor. |
