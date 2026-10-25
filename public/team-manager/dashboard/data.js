// The opening's alliance selection, as the scouting tablet sees it (docs/blue-banner-design.md, section 5): 5026 is
// seed 4 and an alliance captain, seeds 1 to 3 have picked, and four teams are left worth a look. The numbers are
// placeholders to tune with the match model (games/frc-strategy/alliance.js); the team numbers are made up for the
// game, so no real team's robot is portrayed.
//
// The tablet knows different things on different Saturdays:
//   thin   the first time: one page of averages and pit notes from the senior strategist, who's off sick. Only her own
//          robot has match data. The gaps are "?", each with whoever on the team knows the answer.
//   full   after the van and Friday's scouting: every team's ten qualification matches, and the answers to the "?".
// A team's `known` says what each Saturday shows; anything missing there is unknown that time.

/** What a robot scores with, as chips. Colours are dashboard.css's. */
export const CHIPS = {
  hatch: 'ROCKET HATCH',
  cargo: 'CARGO SHIP',
  l3: 'L3 CLIMB',
  l2: 'L2 CLIMB',
  auto: 'SANDSTORM',
  def: 'DEFENSE',
};

/** Who on the team knows what (the van, design doc section 5), drawn from the cast's faces (cast.js student()). */
export const WHO = {
  scout: { face: 1, role: 'THE SCOUT LEAD' },
  coach: { face: 3, role: 'THE DRIVE COACH' },
  programmer: { face: 4, role: 'THE PROGRAMMER' },
};

export const YOU = {
  num: '5026', name: 'YOUR ROBOT', seed: 4, chips: ['hatch', 'l3'],
  scores: [28, 33, 18, 31, 35, 22, 34, 30, 36, 33],
  known: {
    thin: { note: 'LEVEL 3 CLIMB: "CONFIDENT"', who: 'programmer', ask: 'Is it, though?' },
    full: { note: 'LEVEL 3 CLIMB: 6 OF 10 IN PRACTICE (THE LOGS)' },
  },
};

export const TEAMS = [
  {
    num: '7461', name: 'GEARHAWKS', chips: ['hatch', 'l3', 'auto'],
    scores: [44, 38, 47, 41, 36, 45, 40, 43, 37, 39],
    known: {
      thin: { note: 'BIG, FAST, LOUD FANS. EVERYONE WANTS THEM.' },
      full: { note: 'SCORES ON THE ROCKET AND CLIMBS TO LEVEL 3. SO DO YOU.' },
    },
    together: { full: 51, why: 'ONE LEVEL 3 PLATFORM: -12. ONE LOADING STATION BETWEEN YOU: -8.' },
    verdict: {
      thin: ['bad', 'Averages don\'t add up. You both need the one Level 3 platform and the same loading station: together about 51, not 71.', 18],
      full: ['bad', 'Still the biggest number, still the wrong partner: together about 51.', 18],
    },
  },
  {
    num: '6834', name: 'STEEL OWLS', chips: ['cargo', 'l2', 'auto'],
    scores: [30, 31, 32, 30, 33, 31, 29, 32, 31, 31],
    known: {
      thin: { note: 'NEVER BROKEN DOWN. CARGO SHIP SPECIALISTS.' },
      full: { note: 'NEVER BROKEN DOWN. SCORES WHERE YOU DON\'T.' },
    },
    together: { full: 61, why: 'NO OVERLAP: CARGO WHILE YOU DO HATCHES, LEVEL 2 WHILE YOU TAKE LEVEL 3.' },
    verdict: {
      thin: ['good', 'The best pick on what you knew: steady, and it scores where you don\'t.', 34],
      full: ['ok', 'Solid, and it fits. But you know something better now.', 44],
    },
  },
  {
    num: '6417', name: 'RUST BELT ROBOTICS', chips: ['cargo', 'l2', 'def'],
    scores: [6, 9, 4, 12, 8, 35, 38, 34, 37, 36],
    known: {
      thin: { note: 'AVERAGE 22. WHY SO LOW?', who: 'scout', ask: 'Who got better as their last event went on?' },
      full: { note: 'BROKE A CHAIN IN EACH OF THEIR FIRST FIVE MATCHES. SINCE THE FIX: 36.' },
    },
    together: { full: 66, why: 'THEIR LAST FIVE MATCHES, AND NO OVERLAP WITH YOU.' },
    verdict: {
      thin: ['bad', 'A guess: an average of 22 and a question mark. (It was the best pick, if you\'d known why.)', 27],
      full: ['good', 'Since match 6 they average 36, and they score where you don\'t. The best pick.', 58],
    },
  },
  {
    num: '8724', name: 'BRICK WALL BOTS', chips: ['def'],
    scores: [15, 20, 18, 17, 22, 16, 19, 18, 17, 18],
    known: {
      thin: { note: 'A DEFENDER. LOW AND HEAVY.' },
      full: { note: 'OPPONENTS SCORE 9 FEWER WHEN THEY DEFEND. A SECOND PICK, NOT A FIRST.' },
    },
    together: { full: 48, why: 'FEWER POINTS OF YOUR OWN, PLUS WHAT THEIR DEFENSE TAKES AWAY.' },
    verdict: {
      thin: ['bad', 'A defender first? Not yet: you need points before you need defense.', 15],
      full: ['bad', 'Right robot, wrong round: take them second, to defend the top seed\'s captain.', 21],
    },
  },
];

/** Picked already: seeds 1 to 3 and their first picks. */
export const TAKEN = [
  ['1', '4000', '2468'],
  ['2', '3000', '7777'],
  ['3', '8086', '9152'],
];
