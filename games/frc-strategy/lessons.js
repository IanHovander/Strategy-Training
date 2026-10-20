// Every lesson, in one place. The team game (rules.js, host.js, player.js) and the solo page (lessons.html)
// both read from here, so editing a question once changes both.
//
// A lesson has three parts, played in order:
//   learn     team game: the Strategy Room (lesson1-room.js), match-day calls the room argues out with a student
//             moderator (room-rules.js). The solo page can't run a discussion, so its Learn is the part's `solo`:
//             scored case studies (lesson1-learn.js), exact answers first, then more details and unknowns each step
//   test      one question per investigation (lesson1-test.js)
//   draft     the Showdown (lesson1-draft.js): two groups pick alliances and play a best of three; team game only
//
// Text may contain <b>…</b>: it's written here, never typed by players, so the screens insert it as HTML.
// A question (learn steps and test investigations):
//   type                 'choice' (default), 'multi' (pick all that matter) or 'number' (estimate with a slider)
//   title, prompt        what's asked
//   choices              choice / multi: [{ text, points, result }]; result is what the model says about it.
//                        In a multi, red herrings have negative points.
//   number               number: { value, min, max, step, unit, tiers: [[within, points], ...] }
//   hint                 optional nudge the player can open
//   takeaway, explain    the lesson, shown at the reveal
//   discuss              optional prompt for the group to talk through after the reveal
//   explore              optional sliders/toggles and a model(values) to play with after the reveal
// Learn cases and steps (lesson1-learn.js) also have:
//   case: title, setup, prepares (the Test investigations it gets you ready for), steps
//   step: facts          new details added to the case file at this step
//         exhibit        evidence added to the case file: { title, sides: [a, b], matches: [[a, b], …] } (match
//                        results) or { title, stats: [[label, value], …] }, plus an optional note
// Each Learn step also gets its case's title, setup and everything revealed so far (see `fromCases`).
import { LEARN } from './lesson1-learn.js';
import { ROOM } from './lesson1-room.js';
import { TEST } from './lesson1-test.js';
import { DRAFT } from './lesson1-draft.js';

/**
 * Lay out a part's cases as one list of questions. Each question learns its case's title and setup, its
 * place in the case, and every fact and exhibit revealed so far (`isNew` for the ones this step adds).
 */
function fromCases(cases) {
  return cases.flatMap((c, caseIndex) => {
    const facts = [];
    const exhibits = [];
    return c.steps.map((step, i) => {
      for (const f of [...facts, ...exhibits]) f.isNew = false;
      facts.push(...(step.facts ?? []).map((text) => ({ text, isNew: true })));
      if (step.exhibit) exhibits.push({ ...step.exhibit, isNew: true });
      return {
        ...step,
        section: `Case ${caseIndex + 1} · Step ${i + 1} of ${c.steps.length}`,
        caseIndex,
        caseTitle: c.title,
        setup: c.setup,
        prepares: c.prepares ?? [],
        facts: facts.map((f) => ({ ...f })),
        exhibits: exhibits.map((e) => ({ ...e })),
        firstInCase: i === 0,
        lastInCase: i === c.steps.length - 1,
      };
    });
  });
}

export const LESSONS = [
  {
    id: 'risk',
    number: 1,
    title: 'Risk & Consistency',
    tagline: "Winning isn't the same as scoring more.",
    summary: 'When to play it safe, when to gamble, and the hidden assumptions behind both.',
    parts: [
      {
        id: 'learn',
        kind: 'room',
        title: 'Learn',
        blurb: 'The Strategy Room: five match-day calls. Make the call, argue it out, ask the moderator anything. No answer key.',
        cases: ROOM,
        solo: {
          id: 'learn',
          kind: 'quiz',
          title: 'Learn',
          blurb: 'Case studies that build up to the Test. Each starts with an exact answer, then adds evidence and unknowns to weigh, rate your confidence in, and argue out.',
          leaderboard: 'case', // after each case, not every step
          cases: LEARN,
          questions: fromCases(LEARN),
        },
      },
      {
        id: 'test',
        kind: 'quiz',
        title: 'Test',
        blurb: 'Eleven investigations, one scored question each. Show what you learned.',
        leaderboard: 'question',
        questions: TEST,
      },
      {
        id: 'draft',
        kind: 'draft',
        title: 'Showdown',
        blurb: 'Two groups, two alliances. Study the event’s teams, build a picklist, run alliance selection, then win a best of three. Team game only.',
        draft: DRAFT,
      },
    ],
  },
];

/** The badge on each answer, so the room can talk about "answer 2". */
export const SHAPES = ['1', '2', '3', '4', '5', '6'];

export const lessonById = (id) => LESSONS.find((l) => l.id === id) ?? null;
export const partById = (lesson, id) => lesson?.parts.find((p) => p.id === id) ?? null;
