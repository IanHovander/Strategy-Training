// What everyone says once the meeting breaks up and she can walk the lawn: a conversation each (talk.js: a page is two
// lines of up to 38 characters, said by whoever she's talking to, or { name, lines } for someone chiming in). Each is
// in that person's own voice, picks up something from the meeting, and where it comes naturally teaches something real
// about FRC in 2019, the Deep Space season the art shows: the sandstorm, the rocket's hatch ports, the HAB, scouting
// and pick lists, the drive team, inspection, safety glasses in the pits, gracious professionalism, the Chairman's
// Award. The strategist and the teammate are HERO_NAME and TEAMMATE_NAME (cast.js) until they have names.
//   tessa     co-captain, the shout-outs: why they matter, and a job for the strategist next meeting
//   owen      co-captain, the updates: inspection before anything else, and a packing list
//   teammate  sits beside her: the pick list, nerves about the regional, the van ride
//   bea       build lead, looking in at the robot: the two-stage elevator, the hatch ports, chain and rivets
//   kenji     programmer, under the tree with a laptop: the sandstorm and the vision code
//   luis      scouting lead, on the bench: six scouts a match, match and pit scouting, the pick list
//   nadia     outreach lead, at the sign-up table: sponsors, the demo, the Chairman's Award
//   jamal     drive coach, in a huddle with his drivers: who's on 5026's drive team, cycles
//   eli       a freshman, before his first event: there's a job for everyone
//   okafor    the engineer who mentors the team, at the thank-you card: safety, gracious professionalism
//   brandt    the teacher who signs the forms, on the bench: forms, the van at six, a dad joke

import { HERO_NAME } from '../cast.js';

export const LINES = {
  tessa: [
    ['SHOUT-OUTS ARE MY FAVORITE PART. HALF', 'OF WHAT THIS TEAM DOES, NOBODY SEES.'],
    ['LIKE WHOEVER SWEPT THE METAL SHAVINGS', 'OUT OF THE SHOP AT TEN LAST NIGHT.'],
    ['NEXT MEETING, YOU GIVE ONE. SOMEONE', 'NOBODY ELSE SAW. YOU NOTICE THINGS.'],
    { name: 'OWEN, CO-CAPTAIN', lines: ['UNDER A MINUTE, PLEASE.', "I'LL BE TIMING IT."] },
  ],
  owen: [
    ['BEFORE OUR FIRST QUAL MATCH WE HAVE TO', 'PASS INSPECTION. NO PASS, NO PLAY.'],
    ['WEIGHT: 125 POUNDS MAX, NOT COUNTING', 'THE BUMPERS OR THE BATTERY.'],
    ['BUMPERS BUILT TO SPEC, AND THE FRAME', 'PERIMETER 120 INCHES AT MOST.'],
    ['SO WE WEIGH IT FIRST THING AT LOAD-IN.', 'I MADE A PACKING LIST. AND A BACKUP.'],
  ],
  teammate: [
    [`${HERO_NAME} OF THE WEEK, EVERYBODY.`, 'CAN I HAVE YOUR AUTOGRAPH NOW?'],
    ['FOR THE RECORD, I CLAPPED THE LOUDEST.', 'I HAVE WITNESSES.'],
    ['REAL TALK, A WHOLE REGIONAL MAKES MY', 'STOMACH DO A LEVEL 3 CLIMB.'],
    ['VAN PLAN: BACK ROW, SNACKS, AND YOU', 'TEACHING ME THE PICK LIST. DEAL?'],
  ],
  bea: [
    ['OUR PRACTICE BOT. TWO-STAGE ELEVATOR:', 'SECOND STAGE RIDES INSIDE THE FIRST.'],
    ['ROCKET HATCH PORTS: 19, 47, 75 INCHES.', 'THAT LAST ONE FOUGHT US ALL SEASON.'],
    ['THE TRICK WAS CHAIN TENSION. TOO LOOSE', 'IT SKIPS, TOO TIGHT IT EATS BEARINGS.'],
    ["I'VE PULLED FOUR HUNDRED RIVETS SINCE", 'JANUARY. I DREAM IN RIVETS.'],
  ],
  kenji: [
    ['FIRST 15 SECONDS ARE THE SANDSTORM.', "A SCREEN BLOCKS THE DRIVERS' VIEW."],
    ['SO THEY DRIVE BY CAMERA, OR THE ROBOT', 'DRIVES ITSELF. WE DO A BIT OF BOTH.'],
    ['THE VISION CODE FINDS THE REFLECTIVE', 'TAPE BY A HATCH PORT AND LINES US UP.'],
    ["ONCE IT LINED UP ON A REFEREE'S VEST.", 'FIXED NOW. MOSTLY.'],
  ],
  luis: [
    ['SIX SCOUTS A MATCH, ONE PER ROBOT.', 'EVERY HATCH, EVERY CARGO, EVERY CLIMB.'],
    ["THAT'S MATCH SCOUTING. PIT SCOUTING IS", 'WALKING THE PITS ASKING ABOUT ROBOTS.'],
    ['IT ALL GOES IN THE SPREADSHEET, AND', 'THE SHEET BECOMES YOUR PICK LIST.'],
    ["WHEN YOUR LIST IS RIGHT, THAT'S SIX", 'TIRED SCOUTS BEING RIGHT. TELL THEM.'],
  ],
  nadia: [
    ['SIGNING UP FOR MAPLE? THE KIDS GET TO', "DRIVE THE ROBOT. IT'S THE BEST DAY."],
    ['SPONSORS PAY FOR PARTS, ENTRY FEES AND', 'THE VANS. SO WE WRITE THEM CARDS.'],
    ["THE DEMO GOES IN OUR CHAIRMAN'S AWARD", "ESSAY. IT'S THE TOP AWARD IN FRC."],
    ["AND IT ISN'T FOR THE ROBOT. IT'S FOR", 'WHAT THE TEAM DOES FOR EVERYONE ELSE.'],
  ],
  jamal: [
    ['OUR DRIVE TEAM: A DRIVER, AN OPERATOR,', "A HUMAN PLAYER AND A COACH. THAT'S ME."],
    ['A COACH CAN BE A MENTOR OR A STUDENT.', 'I WATCH THE CLOCK AND CALL PLAYS.'],
    ['PRACTICE IS JUST CYCLES. GRAB A HATCH,', 'SCORE IT, GO BACK. AGAIN. AND AGAIN.'],
    ['SHAVE TWO SECONDS OFF EVERY CYCLE AND', "THAT'S ONE MORE HATCH BY THE BUZZER."],
  ],
  eli: [
    ["IT'S MY FIRST EVENT. I CAN'T BUILD", 'ANYTHING. IS THAT BAD?'],
    ['LUIS SAYS I CAN SCOUT. THE PIT CREW', 'NEEDS SOMEONE TO RUN BATTERIES.'],
    ['NADIA SAYS DEMOS COUNT. AND YELLING IN', 'THE STANDS COUNTS. IT ALL COUNTS?'],
    ["OKAY. I'M BRINGING TWO SAFETY GLASSES", 'IN CASE ONE BREAKS. IS THAT WEIRD?'],
  ],
  okafor: [
    ['IN THE PITS: SAFETY GLASSES. ALWAYS.', "EVEN IF YOU'RE ONLY WALKING THROUGH."],
    ['THE SAFETY ADVISORS AT EVENTS WILL', 'NOTICE. SO WILL I.'],
    ['GRACIOUS PROFESSIONALISM: IF ANOTHER', 'TEAM NEEDS A PART WE HAVE, WE LEND IT.'],
    ["NOW SIGN RIVERSIDE'S CARD. NEATLY.", 'THEY CUT THOSE PLATES FOR NOTHING.'],
  ],
  brandt: [
    ['TWENTY FIELD TRIP FORMS TO CHASE DOWN.', "I'M STARTING WITH YOU."],
    ["THE VANS LEAVE AT SIX. I'LL BE HERE AT", 'FIVE-THIRTY WITH COFFEE. A LOT OF IT.'],
    ['WHY DID THE ROBOT GO ON VACATION?', 'IT NEEDED TO RECHARGE.'],
    ['...NO? TOUGH CROWD.'],
  ],
};
