// Cue sheets for playing the intro over a recorded song instead of the chiptune score.
// Each song was measured (tempo grid, the big hits, the section changes) and the shots are pinned to it:
//   keys: [song time in seconds, shot beat] pairs; the shot plays in between at whatever speed that implies,
//         so a shot can run slower than written (a long climb) or line its big moment up with a hit.
//   buzzer: when the HAB countdown reaches zero (realClock: show real seconds left, for long climbs);
//   flashes: white flashes on big hits; titleAt: the logo drop;
//   loop: the part of the song the title screen repeats (chosen where rhythm and harmony match on both sides).
// The audio goes in public/team-manager/songs/. Compete to Win 3 (the one index.html uses) is there; the other two
// cue sheets were for comparing and need their MP3 dropped in to play.

const grid = (t0, bpm) => (k) => t0 + (k * 60) / bpm;

const w = grid(0.013, 142.333);
const c = grid(0.456, 150.159);
const c3 = grid(0.495, 152.067);

export const SONGS = {
  'wilderness-call': {
    name: 'Wilderness Call',
    file: 'songs/wilderness-call.mp3',
    bpm: 142.333,
    flashes: [0.081],
    realClock: true,
    buzzer: w(129),
    titleAt: w(161),
    loop: [56.91, 70.381],
    cues: [
      // A hit, then quiet: the shooting star writes the name and lands on the bass hit.
      { shot: 'logo', keys: [[0, 0], [1.3, 0.5], [w(7), 2.4], [3.9, 4.4], [4.6, 6.4], [w(12), 8]] },
      // The band comes in: tilt down to the rocket, robot arrives before the bass enters.
      { shot: 'rocket', keys: [[w(12), 0], [w(16), 3.4], [w(19), 5.4], [w(25), 6.6]] },
      // Bass enters with stage one; hatch on the downbeat of the next phrase.
      { shot: 'lift', keys: [[w(25), 0], [w(25.25), 0.25], [w(30), 2], [w(32), 3.2], [w(33), 4], [w(35), 5], [w(41), 8]] },
      // Whip pan to the defender, then a long stare-down in close-ups.
      { shot: 'pan', keys: [[w(41), 0], [w(43), 0.4], [w(47), 2.6], [w(49), 4], [w(57), 6], [w(65), 8]] },
      // The defender rolls in slowly and hits on the new section; spin, sprint; ENDGAME on the breakdown.
      { shot: 'clash', keys: [[w(65), 0], [w(73), 2], [w(75), 3], [w(77), 4], [w(81), 5], [w(89), 6.4], [w(93), 8]] },
      // A long, tense climb through the build; the buzzer lands on the big re-entry.
      { shot: 'hab', keys: [[w(93), 0], [w(97), 1], [w(105), 3], [w(109), 3.75], [w(113), 4.5], [w(121), 6], [w(125), 6.75], [w(127), 7.5], [w(129), 8], [w(133), 12]] },
      { shot: 'win', keys: [[w(133), 0], [w(137), 2], [w(141), 4], [w(143), 5], [w(149), 6.8], [w(159), 11.2], [w(161), 12]] },
    ],
  },
  'compete-to-win': {
    name: 'Compete to Win',
    file: 'songs/compete-to-win.mp3',
    bpm: 150.159,
    flashes: [3.216],
    realClock: true,
    buzzer: c(95),
    titleAt: c(123),
    loop: [c(107), c(139)],
    cues: [
      // The song starts at full tilt, so the logo is quick and the rocket cuts in on the first big hit.
      { shot: 'logo', keys: [[0, 0], [c(1), 0.5], [c(4), 2.4], [c(5.5), 4.4], [c(6.3), 6.4], [3.216, 8]] },
      { shot: 'rocket', keys: [[3.216, 0], [c(11), 3.4], [c(14), 5.4], [c(20), 6.6]] },
      { shot: 'lift', keys: [[c(20), 0], [c(20.25), 0.25], [c(22), 2], [c(24), 3.2], [c(25), 4], [c(27), 5], [c(35), 8]] },
      { shot: 'pan', keys: [[c(35), 0], [c(36), 0.4], [c(40), 2.6], [c(43), 4], [c(47), 6], [c(51), 8]] },
      // Impact on the heaviest kick of the riff section.
      { shot: 'clash', keys: [[c(51), 0], [c(55), 2], [c(56), 3], [c(57), 4], [c(58), 5], [c(60.5), 6.4], [c(63), 8]] },
      // The climb fills the calmer middle and the build; legs fully out on the biggest hit, buzzer on the triumph.
      { shot: 'hab', keys: [[c(63), 0], [c(67), 1], [c(70), 3], [c(74), 3.75], [c(78), 4.5], [c(85), 6], [c(88), 6.75], [c(92), 7.5], [c(95), 8], [c(99), 12]] },
      { shot: 'win', keys: [[c(99), 0], [c(103), 2], [c(107), 4], [c(109), 5], [c(113), 6.8], [c(121), 11.2], [c(123), 12]] },
    ],
  },
  'compete-to-win-3': {
    name: 'Compete to Win 3',
    file: 'songs/compete-to-win-3.mp3',
    bpm: 152.067,
    flashes: [2.194],
    // The original pace: every shot runs at its written speed, about 25 seconds in all, nudged a beat here and
    // there so the big moments land on this song's first hits. The rest of the song plays under the title.
    buzzer: 18.625,
    titleAt: 24.947,
    // The title screen repeats the first full-band phrase, so the big hit at 0:18.6 keeps coming back (every 30 s).
    loop: [14.679, 44.684],
    cues: [
      // The star crosses during the opening swell; the name completes on its peak.
      { shot: 'logo', keys: [[0, 0], [0.6, 0.5], [2.194, 2.4], [3.985, 8]] },
      { shot: 'rocket', keys: [[3.985, 0], [6.371, 6.05]] },
      // Hatch on the downbeat at 0:08.
      { shot: 'lift', keys: [[6.371, 0], [7.992, 4], [8.94, 6.4]] },
      { shot: 'pan', keys: [[8.94, 0], [10.719, 4], [11.51, 6], [12.3, 8]] },
      // The defender is already charging when we cut to it, so it hits on the crash as the band comes in.
      { shot: 'clash', keys: [[12.3, 1.5], [12.498, 2], [14.47, 7], [15.468, 8]] },
      // Buzzer on the strongest early hit; the banner goes up on the next one; title on the hit after that.
      { shot: 'hab', keys: [[15.468, 0], [18.625, 8], [20.204, 12]] },
      { shot: 'win', keys: [[20.204, 0], [21.789, 4], [24.947, 12]] },
    ],
  },
};
