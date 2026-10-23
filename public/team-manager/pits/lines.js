// What's said in the pits: the cut scene's pages, the lines of everyone you can stop and talk to, and what the safety
// advisor calls out if you run. Each page is two lines of at most 38 characters (talk.js), in capitals, and only the
// characters the 5x7 font has: letters, digits, space and ! ? . , : - + ' / > # &. A page is ['LINE ONE', 'LINE TWO'],
// said by whoever the conversation is with, or { name, lines, tag } for someone else (tag: their name tag's colour; the
// strategist's is red).
//
// It's the same Saturday as the arena (bleachers.js), and it follows the arena's queue: 2468 and 1357 are the two robots
// queuing for match 43, and 5026 is called for match 44 right after, as Priya the queuer says. Match 42 is on the field,
// with 3000's and 7777's robots in it. 7777's scout Juno has already been round with her notebook. The strategist and the teammate
// don't have names yet, so nobody here says one: cast.js's HERO_NAME and TEAMMATE_NAME go on their name tags. Everyone
// else talks the way the arena's people do, light and warm, each teaching one real thing about FRC: a volunteer, the
// students on other teams, a judge, our mentor, the pit admin and the safety advisor.

import { C } from '../pixel.js';
import { HERO_NAME, TEAMMATE_NAME } from '../cast.js';

const ELI = 'ELI, 5026 DRIVER';

/** The cut scene's pages: the call over the speakers, the plan before the robot goes, and the hand over to walking. */
export const SCRIPT = {
  // The pit announcer (Tomas at the PIT ADMIN desk), said by the beat's name. He calls an alliance at a time, red
  // first, the way match schedules and the field's own screens list them: 5026 is blue, as Eli says, and 6174 (the
  // defender the plan steers round) is on the other side. Every number is one a team had by 2019.
  call: [
    ['ATTENTION PITS: MATCH 43 TEAMS SHOULD', 'BE IN THE QUEUE NOW.'],
    ['MATCH 44: RED 1100, 3141 AND 6174.', 'BLUE 5026, 2020 AND 7009. QUEUE UP!'],
  ],
  // One page each, so the phone shows whoever is talking: the robot's ready, the driver asks, she gives him the plan off
  // her board, and he reads it back the way drive teams do.
  ready: [
    { name: TEAMMATE_NAME, lines: ['BUMPERS ARE BACK ON. FRESH BATTERY:', '12.8 VOLTS ON THE TESTER. READY!'] },
    { name: ELI, lines: ["THAT'S US. MATCH 44, BLUE ALLIANCE.", "WHAT'S THE PLAN?"] },
    { name: HERO_NAME, tag: C.red1, lines: ['6174 GUARDS THE LEFT ROCKET: GO RIGHT.', 'HATCHES. PINNED? COUNT 5. HAB 3 AT 20.'] },
    { name: ELI, lines: ['RIGHT ROCKET, HATCHES, HAB 3 AT 20.', 'GOT IT. ROLLING!'] },
  ],
  // Noor, up from the robot with her hands on the cart's handle, before she pushes it out into the aisle to the queue:
  // the pits' etiquette for a robot on a cart.
  through: [['ROBOT COMING THROUGH!', 'MAKE A HOLE, PLEASE!']],
  // The teammate, staying behind with the pit.
  duty: [
    ["I'VE GOT PIT DUTY. THE NEXT BATTERY", 'IS ALREADY ON THE CHARGER.'],
    ['GO MEET PEOPLE. AND WALK: THE SAFETY', 'ADVISOR IS WATCHING!'],
  ],
};

/** Everyone you can talk to, by their id in people.js. */
export const LINES = {
  bea: [
    ['NEED A BOLT, A BEARING, A WHOLE', 'MOTOR? SPARE PARTS ARE FREE TO BORROW.'],
    ["IF I DON'T HAVE IT, ASK AROUND. TEAMS", 'LEND EACH OTHER PARTS ALL DAY.'],
    ["EVEN THE TEAM THEY PLAY NEXT. THAT'S", 'GRACIOUS PROFESSIONALISM.'],
  ],
  ruth: [
    ['EVERY BATTERY WE OWN HAS A NUMBER,', 'AND A LINE IN OUR LOG EVERY MATCH.'],
    ['ON THE TESTER BEFORE WE QUEUE. UNDER', "12.5 VOLTS? IT DOESN'T PLAY."],
    ['WE ROTATE THEM SO THEY ALL REST. A', 'TIRED BATTERY CAN BROWN OUT A ROBOT.'],
  ],
  kai: [
    ['OUR ROBOT IS OUT THERE IN MATCH 42.', 'I DREW PIT DUTY. AGAIN.'],
    ['WE BUILT A DEFENDER: LOW, HEAVY, ALL', 'BUMPER. A GOOD ONE SLOWS ANY SCORER.'],
    ['IT CAN PIN YOU FIVE SECONDS, THEN IT', 'HAS TO BACK OFF. THE REFS COUNT TOO.'],
    ['JUNO ALREADY SCOUTED YOUR ELEVATOR.', "NOTHING PERSONAL. IT'S JUST DEFENSE."],
  ],
  davi: [
    ['SHEARED A BOLT IN OUR ELEVATOR LAST', "MATCH. THE NEW ONE'S GOING IN NOW."],
    ['ROBOT IS OFF, SEE? NO LIGHT. NEVER PUT', 'YOUR HANDS IN A ROBOT THAT HAS POWER.'],
    ['AND THREAD LOCKER ON EVERY BOLT. IF IT', 'CAN SHAKE LOOSE, A MATCH WILL DO IT.'],
  ],
  lena: [
    ['DEPLOYING A FIX TO OUR AUTO. ROBOT IS', 'UP ON ITS CART, WHEELS OFF THE GROUND.'],
    ['ALWAYS. ENABLE IT ON THE FLOOR IN THE', 'PITS AND IT DRIVES RIGHT INTO SOMEONE.'],
    ['RULE TWO: NEVER DEPLOY UNTESTED CODE', "RIGHT BEFORE A MATCH. SO DON'T WATCH."],
  ],
  okafor: [
    ["I'M A JUDGE. I WALK THE PITS ALL DAY", 'AND ASK STUDENTS ABOUT THEIR ROBOTS.'],
    ['STUDENTS, NOT MENTORS. THE BEST TEAMS', 'CAN ALL EXPLAIN WHAT THEY BUILT.'],
    ['WE GIVE AWARDS FOR MORE THAN WINNING:', 'DESIGN, QUALITY, OUTREACH, SPIRIT.'],
    ["I'LL COME BY YOUR PIT BEFORE LUNCH. BE", 'READY TO TELL ME ABOUT THAT BOARD.'],
  ],
  teammate: [
    ['PIT DUTY IS MINE TILL 44 IS OVER.', 'BATTERY 3 IS CHARGING. 5 GOES IN NEXT.'],
    ['GO WATCH FROM THE STANDS. SCOUT WHO', 'WE MIGHT PICK, AND WHO WE MIGHT PLAY.'],
    ['AND GOOD LUCK. THE PLAN WAS GOOD: ELI', 'READ IT BACK WITHOUT A SINGLE PAUSE.'],
  ],
  kowalski: [
    ['ME? I KEEP MY HANDS IN MY POCKETS.', "IT'S YOUR ROBOT. YOU ALL BUILT IT."],
    ['I DO SAFETY, THE VAN AND THE SNACKS.', 'MOSTLY THE SNACKS.'],
    ['IF WE FINISH TOP EIGHT, WE PICK OUR', 'OWN ALLIANCE FOR THE ELIMINATIONS.'],
    ['SO THINK ABOUT IT: WHO WOULD YOU ASK', 'FIRST? I WANT A NAME BEFORE LUNCH.'],
  ],
  oscar: [
    ['ODD SQUAD! OUR ROBOT IS IN THE QUEUE', 'FOR 43, SO I GOT BUTTON DUTY.'],
    ['TAKE ONE. TRADING BUTTONS IS A WHOLE', 'THING. SOME KIDS HAVE HUNDREDS.'],
    ['BRING SOME 5026 ONES NEXT TIME AND', "WE'LL TRADE. PANTHERS FOR ODDS."],
  ],
  tomas: [
    ['THAT WAS ME ON THE SPEAKERS. I CALL', 'EVERY MATCH TO THE QUEUE EARLY.'],
    ['A FEW MATCHES AHEAD, SO NOBODY HAS TO', 'RUN. THE SAFETY ADVISOR THANKS ME.'],
    ['PIT MAPS, THE MATCH SCHEDULE, LOST', "AND FOUND: IT'S ALL HERE AT THE DESK."],
  ],
  nadia: [
    ['SAFETY GLASSES ON IN THE PITS, ALL', "DAY, EVEN IF YOU'RE JUST VISITING."],
    ['CLOSED-TOE SHOES, TOO. AND NO RUNNING.', 'I WILL SEE YOU. I SEE EVERYTHING.'],
    ['CARRY A BATTERY BY ITS CASE, NEVER BY', 'THE WIRES. A LOOSE LUG CAN SPARK.'],
    ['WE ADVISORS PICK A SAFETY AWARD, TOO.', 'IT STARTS WITH GLASSES ON.'],
  ],
};

/** What the safety advisor calls out when she sees you running. */
export const RUN_WARNING = [
  ['HEY, 5026! NO RUNNING IN THE PITS.', 'WALKING PACE, PLEASE.'],
  ['PEOPLE ARE CARRYING BATTERIES AND', 'TOOLS, AND ROBOTS ROLL BY ON CARTS.'],
];
