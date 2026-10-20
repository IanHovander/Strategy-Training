// Every lesson, in one place. The team game (rules.js, host.js, player.js) and the solo page (lessons.html)
// both read from here, so editing a question once changes both.
//
// A lesson has three parts, played in order:
//   learn     case studies (lesson1-learn.js): exact answers first, then more details and unknowns each step
//   test      one question per investigation (lesson1-test.js)
//   draft     Alliance Selection (lesson1-draft.js): two teams draft robots and play a best of three; team game only
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
// Learn steps also get the case they belong to (see `fromCases`).
import { LEARN } from './lesson1-learn.js';
import { TEST } from './lesson1-test.js';
import { DRAFT } from './lesson1-draft.js';

/**
 * Lay out a part's cases as one list of questions. Each question learns its case's title and setup, its
 * place in the case, and every fact revealed so far (`isNew` for the ones this step adds).
 */
function fromCases(cases) {
  return cases.flatMap((c, caseIndex) => {
    const facts = [];
    return c.steps.map((step, i) => {
      for (const f of facts) f.isNew = false;
      facts.push(...(step.facts ?? []).map((text) => ({ text, isNew: true })));
      return {
        ...step,
        section: `Case ${caseIndex + 1} · Step ${i + 1} of ${c.steps.length}`,
        caseIndex,
        caseTitle: c.title,
        setup: c.setup,
        facts: facts.map((f) => ({ ...f })),
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
        kind: 'quiz',
        title: 'Learn',
        blurb: 'Six case studies. Each starts with an exact answer and adds a detail at every step, until you’re spotting unknowns and arguing them out.',
        leaderboard: 'case', // after each case, not every step
        cases: LEARN,
        questions: fromCases(LEARN),
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
        title: 'Alliance Selection',
        blurb: 'Two teams scout twelve robots, draft alliances of three, and play a best of three. Captains pick; everyone advises. Team game only.',
        draft: DRAFT,
      },
    ],
  },
];

/** The badge on each answer, so the room can talk about "answer 2". */
export const SHAPES = ['1', '2', '3', '4', '5', '6'];

export const lessonById = (id) => LESSONS.find((l) => l.id === id) ?? null;
export const partById = (lesson, id) => lesson?.parts.find((p) => p.id === id) ?? null;
