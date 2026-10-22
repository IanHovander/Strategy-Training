// What everyone at the practice field says. The scene is the school cafeteria after school: half a 2019 field built from
// plywood on taped-down carpet, the sun low in the windows, and 5026's robot running timed hatch cycles while the drive
// team practises. When the cut scene hands her over, the strategist can walk round the field and talk to all ten of
// them. Each has a few pages about their job on the team, and most of them teach something real about FRC in 2019 (Deep
// Space): why cycles are timed, how the drive team splits the work, how hatch panels go on the rocket, battery care,
// scouting, safety.
//
// A page is two lines of at most 38 characters in the dialog box's 5x7 capitals (pixel.js font 5): A-Z, 0-9, space and
// ! ? . , : - + ' / & #. No parentheses, double quotes or per cent signs: the font hasn't got them. The place card's
// second line is the small 3x5 font, which has no comma or question mark either.
// The two people the story follows have no names yet: the dialog calls them HERO_NAME and TEAMMATE_NAME (cast.js), and
// nobody here says a name for either.

/** The place card as the cut scene opens (stage.js placeCard). */
export const CARD = { name: 'PRACTICE FIELD', sub: 'SCHOOL CAFETERIA - 4:40 PM' };

/** The scene's name for the phone, what the big screen shows for screen readers, and the note under the controls. */
export const SCENE_TEXT = {
  name: 'PRACTICE FIELD',
  label: "The school cafeteria after school, with half a 2019 field built from plywood on taped-down carpet and late sun "
    + "streaming through tall windows. 5026's robot runs timed hatch cycles while the drive team practises, and the "
    + "strategist you're steering walks the floor around the field; the view follows her",
  note: 'Push the stick a little to walk, all the way to run. Stay off the carpet while the robot is running: walk round '
    + 'the field instead, and press A by anyone to talk. In the cut scene, A reads on and SKIP jumps to the end. On a '
    + 'keyboard: arrow keys or WASD, Shift to run, Space or Enter to talk, Esc to skip.',
};

/** Who says what, by person (people.js has their names and looks). Each is two to four pages. */
export const LINES = {
  // The mentor, with the stopwatch.
  okafor: [
    ['WE TIME EVERY CYCLE. A SECOND OFF ONE', 'CYCLE IS NOTHING. OFF ALL OF THEM...'],
    ["TEN CYCLES A MATCH, THAT'S TEN", 'SECONDS. ONE MORE HATCH ON THE ROCKET.'],
    ["NONE OF THIS IS PRETTY. IT DOESN'T", 'HAVE TO BE.'],
    ['THE HEIGHTS AND DISTANCES ARE RIGHT', 'TO THE INCH. THAT PART MATTERS.'],
  ],
  // The drive coach.
  teammate: [
    ["I'M THE DRIVE COACH. I STAND BEHIND", 'JALEN AND MEI AND CALL THE PLAYS.'],
    ['THEY WATCH THE ROBOT. I WATCH THE', 'WHOLE FIELD: DEFENSE, PARTNERS, CLOCK.'],
    ["WHEN YOU SCOUT, GET ME OTHER TEAMS'", 'CYCLE TIMES. I PLAN AROUND THEM.'],
  ],
  jalen: [
    ["THE ROCKET'S HATCH PORTS ARE ON ITS", 'ANGLED SIDES, NOT ON THE FRONT.'],
    ["COME IN CROOKED AND THE HATCH WON'T", 'STICK. I LINE UP SQUARE EVERY TIME.'],
    ["THERE'S NO TRICK TO DRIVING. IT'S", 'REPS. FIFTY CYCLES A NIGHT.'],
  ],
  mei: [
    ['JALEN DRIVES. I RUN THE ELEVATOR AND', 'THE HATCH GRABBER ON MY CONTROLLER.'],
    ['EVERY LEVEL IS ONE BUTTON. PRESS IT', 'AND THE LIFT GOES RIGHT TO HEIGHT.'],
    ['SO HE NEVER WAITS ON ME. TWO PEOPLE,', 'ONE ROBOT, NO ARGUING. MOSTLY.'],
  ],
  ines: [
    ['I FEED HATCH PANELS THROUGH THE SLOT', 'IN THE LOADING STATION.'],
    ['HUMAN PLAYER IS DRIVE TEAM TOO. AT', "EVENTS I'M AT THE STATION WITH THEM."],
    ['THE TRICK IS TIMING. THE HATCH HAS TO', 'BE THERE THE MOMENT THE ROBOT IS.'],
  ],
  noor: [
    ['WE SCOUT OUR OWN PRACTICE, WITH THE', 'SAME APP WE USE AT EVENTS.'],
    ["IF WE CAN'T TRUST OUR OWN NUMBERS,", "WE CAN'T TRUST ANYBODY ELSE'S."],
    ['THE AVERAGES GO ON YOUR BOARD. LEVEL', 'TWO IS 10.2 SECONDS THIS WEEK.'],
  ],
  theo: [
    ["I'M TUNING THE ELEVATOR PRESETS.", 'LEVEL THREE WAS TWO INCHES LOW.'],
    ['CHANGE ONE NUMBER, DEPLOY THE CODE,', 'AND MEI TRIES IT AGAIN.'],
    ["IF IT'S STILL LOW, IT'S MECHANICAL.", "IT'S ALWAYS MECHANICAL."],
  ],
  bea: [
    ['EVERY BATTERY HAS A NUMBER, AND EVERY', 'CHARGE GOES IN THE LOG.'],
    ['CHARGER, THEN THE TESTER, THEN THE', 'ROBOT. NEVER SKIP THE TESTER.'],
    ['TEAM RULE: UNDER 12.5 VOLTS, IT STAYS', 'ON THE CHARGER.'],
    ['A TIRED BATTERY MAKES A SLOW ROBOT,', 'AND THEN EVERYONE BLAMES THE DRIVER.'],
  ],
  // The first thing Kai says is why she can't walk on the carpet. (The space bar is the Driver Station's emergency stop.)
  kai: [
    ['HOLD UP! STAY OFF THE CARPET WHILE', 'THE ROBOT IS ENABLED.'],
    ['IT WEIGHS MORE THAN YOU, AND IT', "MOVES FASTER THAN YOU CAN JUMP."],
    ['IF IT EVER GETS LOOSE, YELL STOP.', 'MEI HITS THE SPACE BAR: E-STOP.'],
  ],
  flores: [
    ['TABLES BACK IN ROWS BY SIX. BREAKFAST', 'IS AT SEVEN, AND I MOP BEFORE THAT.'],
    ['AND THAT TAPE COMES UP OFF MY FLOOR.', 'ALL OF IT. LAST TIME I FOUND A BOLT.'],
    ["DON'T TELL ANYONE, BUT I WATCH YOUR", 'MATCHES ONLINE. GO WIN THAT BANNER.'],
  ],
};
