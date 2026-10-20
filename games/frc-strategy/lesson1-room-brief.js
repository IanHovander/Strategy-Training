// Lesson 1, Learn: the moderator's private brief for each Strategy Room case (lesson1-room.js has what everyone sees).
//
// Only the rules import this file (room-rules.js), and only the moderator's phone is sent the current case's brief.
// Never import it from lessons.js, player.js or host.js: every phone loads those, and the big screen is on the
// projector. (On the website the file can still be downloaded by anyone who looks for it, like the rest of the site.)
//
// The cases' numbers are fictional and fixed, so the story holds together whatever the room asks.
//   framing         what the case is really about, and the clue students can uncover
//   truth           [label, text]: the hidden numbers behind the case
//   ready           what the moderator can answer straight away
//   unknown         what nobody knows yet
//   prompts         lines for when the discussion stalls
//   breakthrough    high-value questions to listen for
//   records         existing evidence, shared for free when someone asks: { id, title, text }
//   investigations  deeper work that costs one effort credit: { id, title, effort, result }

/** Effort credits per case, for investigations. Questions and existing records are always free. */
export const CREDITS = 2;

export const BRIEFS = [
  {
    breakthrough:['Were the 7-cycle scores from defended matches?','Will B be defended in OUR upcoming match?','How many comparable undefended matches were scouted?'],
    framing:'Warm-up: B = 9 is only a simplified first call. Once scouting opens, THE CLUE is match context. All ten B qualifiers happened already: B scored 7 in eight DEFENDED matches, 9 in two UNDEFENDED matches. In our upcoming one-on-one B will not face defense. Students should be able to uncover this by asking about defense, footage, or what caused the lower scores. Do not volunteer the clue unless they ask or discussion truly stalls.',
    truth:[
      ['Warm-up model','B = 9 every time; Safe = 8; Aggressive = 11 (70%) or 4 (30%). These are game rules for the first call only.'],
      ['Underlying B model, CONDITIONAL on defense','When UNDEFENDED: 9 cycles ~75%, 7 cycles ~25%. When DEFENDED: 7 cycles ~80%, 9 cycles ~20%. The ten historic matches are not all comparable to our upcoming undefended matchup. These are hidden design assumptions, not probabilities obtained from the ten samples.'],
      ['Hidden real-world Safe model','8 cycles 91%, 6 cycles 7%, 0 cycles 2%. Safe is NOT physically guaranteed.'],
      ['Hidden real-world Aggressive model','11 cycles 65%, 4 cycles 32%, 0 cycles 3%. Practice sample happens to show 7/10 good runs.'],
      ['Existing B qualification log','Match 1: 7 (defended); 2: 7 (defended); 3: 7 (defended); 4: 9 (undefended); 5: 9 (undefended); 6–10: 7 each (defended). The FIRST five are supplied at reveal 1; the other five are already played and available by checking the log.'],
      ['How reliable are the practice rates?','Aggressive: 7/10 high; Safe: 3/3 scored 8. All undefended. No measured breakdown rate yet. B does not face a defender in our upcoming one-on-one.']
    ],
    ready:['Exact rules of the simplified first call','All ten B qualification scores already on file, including whether B faced defense','A’s small practice samples and what conditions they used','Which robot will actually face defense in the upcoming one-on-one'],
    unknown:['How either A plan performs under other match conditions','What B’s undefended scoring probabilities actually are (only two comparable historic matches)','Whether A’s small practice samples transfer to a competition match'],
    prompts:['First let the room argue about the score. Later, if stuck, ask “Those 7-cycle games—what do we know about how B was being played?”','If they ask about the mismatch between 9 and 7, offer the existing match sheet before providing an interpretation.','If they ask “Can we just watch 12 more matches?”, explain the schedule is over. They can inspect recordings that already exist, not invent additional match results.'],
    records:[
      {id:'a-five',title:'Five-match scouting card',text:'B’s five recorded scores: 7, 7, 7, 9, 9. Defense tags: yes, yes, yes, no, no.'},
      {id:'a-ten',title:'Full existing qualification card',text:'Ten already-played B matches: 7,7,7,9,9,7,7,7,7,7. All eight 7-cycle games involved defense; neither 9-cycle game did. There are NO more qualification matches to collect.'},
      {id:'a-setup',title:'Conditions for our upcoming match',text:'Our matchup is one-on-one. Neither robot is assigned a defender. B will not be defended by our alliance.'},
      {id:'a-practice',title:'A’s practice records',text:'Aggressive scored 11 in seven of ten undefended tests, otherwise 4. Safe scored 8 in three of three undefended tests. Neither is proven guaranteed.'}
    ],
    investigations:[
      {id:'a-tests',title:'Inspect A’s practice logs for hidden failures',effort:'Mechanism logs + driver notes from the 13 ALREADY-RUN practice attempts',result:'The seven aggressive successes were all undefended. The three safe trials were done earlier, on a clear field. No useful reliability conclusion can be drawn from three clean safe runs.'},
      {id:'a-opponent',title:'Deep-review B’s existing qualification footage',effort:'Rewatch and timestamp the 10 available qualification videos; no extra matches',result:'In the eight already-played 7-cycle matches, defenders forced B to take a longer route. In the two 9-cycle matches, B ran undefended. We cannot measure B’s true undefended probability from just two comparable games.'},
      {id:'a-defense',title:'Check A’s shooter before the match',effort:'Quick sensor and mechanism inspection in the pits',result:'No loose connector or obvious damage. This rules out one failure mode but does not prove either scoring strategy will be consistent.'}
    ]
  },
  {
    breakthrough:['When shot one missed, what happened to shot two?','Are the shots linked by the camera or alignment?','What does the paired-shot log say, rather than the overall make rate?'],
    framing:'The INITIAL report gives each shot’s historical make rate, not independence. THE CLUE is in the existing ten-auto log: seven double hits, three double misses, zero single hits. Questions like “Do they miss together?” or “What does the camera log show?” should receive this free evidence immediately, even before the scheduled reveal. Do not announce the concept of correlation for them.',
    truth:[
      ['What the initial 70% means','Each of the two shots made it in seven of ten recorded auto runs. It does NOT imply independence. Assuming independence would give 49% both, 42% exactly one, 9% neither; that is a model students might propose, not an established fact.'],
      ['Underlying linked system','A shared camera alignment affects both shots. In the simplified hidden model, alignment succeeds ~70% per auto, and otherwise neither shot scores. Ten observed paired attempts: seven double makes, three double misses.'],
      ['Independent revision','When software re-aligns independently between shots, per-shot accuracy becomes 65% and the shot outcomes are independent.'],
      ['Reliable routine','Six prior practice runs scored 12 points each. Our simplified model uses a steady 12, but the physical mechanism is not actually guaranteed.'],
      ['Opponent conditions','First opponent auto = 15 points; later opponent auto = 5. Both fixed by the simplified scenario.'],
      ['What is known at the start?','Ten previous autos are already on film, with shot-one and shot-two results and camera diagnostics. Seven (hit,hit); three (miss,miss). We can retrieve this record without playing additional matches.']
    ],
    ready:['Recorded outcomes of both shots across the same ten historical runs','Whether the camera is shared between shots','How many runs support each option','Whether a tie counts as a win'],
    unknown:['How long each routine takes without measuring','Whether current alignment success persists at a different venue','What a real opponent does after autonomous'],
    prompts:['If the room stalls, ask “Do we know what happened on BOTH shots in each run?”','If someone asks if 70% per shot means independence, say “The report only gives each shot’s make rate. What evidence would you check?”'],
    records:[
      {id:'b-pairs',title:'Original 10 autonomous scorecards',text:'Shot pairs, each worth 10 points: (hit,hit) in seven runs; (miss,miss) in three runs; (hit,miss) and (miss,hit) both zero. Each shot individually went in seven times.'},
      {id:'b-hardware',title:'Camera wiring and software diagram',text:'Both original shots use the SAME pose estimate from the SAME camera alignment. The routine does not take a fresh alignment between shots.'},
      {id:'b-reliable',title:'Reliable routine practice sheet',text:'Reliable scored 12 points in all six recorded trials. That is strong short-run evidence, not a promise that the real robot cannot fail.'}
    ],
    investigations:[
      {id:'b-camera',title:'Diagnose the ten existing camera failures and successes',effort:'Synchronize camera logs with the 10 ALREADY-RECORDED auto videos',result:'All three double-miss runs contain a shared alignment failure. The seven double-make runs have good alignment. No additional match attempts have been created.'},
      {id:'b-test',title:'Inspect separate-alignment software readiness',effort:'Review the new camera code and calibration logs before committing',result:'The redesign estimates 65% accuracy per shot from bench calibrations, but it has not been run under competition conditions. The estimate remains uncertain.'},
      {id:'b-timing',title:'Check timestamps on existing autonomous videos',effort:'Measure elapsed time from stored footage; no new runs',result:'Recorded median times: Linked 9.2 seconds (10 videos); Reliable 8.3 seconds (six videos). No full match footage exists for the new independent routine.'}
    ]
  },
  {
    breakthrough:['Did B ever stop defending because it failed?','Did C change routes when it met defense?','Was the connector problem actually fixed?'],
    framing:'Separate defensive effectiveness from breakdown reliability and opponent adaptation. The early 60% is a cycle-by-cycle stop chance against the original route, not a guarantee of stopping 60% of points in every match.',
    truth:[
      ['Base robots','Our A = 10 cycles, our B = 5; their C = 12 cycles 60% / 8 cycles 40%, and D = 4. These values are case-model assumptions.'],
      ['Defense on original route','If B stays functional, it independently stops each C attempt with p = 60%. B forgoes its own 5 cycles.'],
      ['Old failure mechanism','The eight recorded defense trials were four failures and four completions. For the constructed scenario, the underlying pre-repair failure chance was ~50%.'],
      ['After the repair','Under-the-surface post-repair failure chance in the fictional scenario is 12%; the team DOES NOT know this without retesting.'],
      ['Alternate route','Against C’s alternate route, B only stops each attempt with p = 35% if it stays functional. Scouts have not measured this yet.'],
      ['Opportunity cost caveat','Robot B’s 5 cycles are treated as fixed in the opening toy model. Real offensive output may vary; there is no existing evidence about it.']
    ],
    ready:['How the stop probability is defined','Eight old defensive test outcomes','What the pit crew found and whether the connector was repaired'],
    unknown:['Actual post-repair reliability until it is tested','Whether C will switch routes or fight through defense','Risk of penalties and lane congestion'],
    prompts:['“Are we counting attempted cycles or completed cycles?”','“Would you choose defense if it broke every other match? Would you choose it if the repair is solid?”'],
    records:[
      {id:'c-practice',title:'Eight prior defensive practice logs',text:'B finished four defensive assignments and completed none of the other four. The four failures involved drive electronics dropping out; the mechanic later found a loose connector.'},
      {id:'c-offense-card',title:'Eight old offensive scorecards',text:'B’s existing scores on offense: 5, 5, 5, 5, 4, 4, 3, 0. The opening 5-cycle figure is a teaching approximation.'}
    ],
    investigations:[
      {id:'c-retest',title:'Vibration-check B’s repaired connector',effort:'Inspect wiring and run short loaded vibration checks in the pits',result:'The connector stayed seated during 30 short vibration/load checks. Those checks cannot tell us exactly how reliable B will be over a full match.'},
      {id:'c-alternate',title:'Audit C’s existing alternate-route video',effort:'Review and code already-played film where C changed routes under defense',result:'C used an alternate route in two archived defended matches. It kept most of its scoring attempts there; we do not have a controlled estimate of how well B would stop that route.'},
      {id:'c-offense',title:'Audit B’s already-played offense matches',effort:'Recheck eight past offensive scorecards and video',result:'B scored 5,5,5,5,4,4,3,0 across eight prior offensive matches. Five cycles was an optimistic simplified input, not a real guarantee.'}
    ]
  },
  {
    breakthrough:['Does the mechanism failure persist between playoff matches?','Is a repair guaranteed to reset the risk?','Where did those match-win percentages come from?'],
    framing:'Here the source of randomness is the main thing. A shared failure across the entire series is not interchangeable with a fresh per-match lottery, even if the marginal match rate is the same.',
    truth:[
      ['Steady model','Each match independently has a 70% win probability with Steady.'],
      ['Fragile before reset','75% chance of being functional for the ENTIRE series. If functional, all series matches win; if broken, all series matches lose.'],
      ['Fragile after reset','Each match independently has a 75% chance that its mechanism works; good means a win, bad means a loss (fictional simplified model).'],
      ['Observed evidence','Fragile operated correctly in three of four qualification matches. Steady estimate draws on 30 prior matches. Neither sample proves its stated true rate.'],
      ['Independence','Outcomes are conditionally independent only after successful between-match resets. Asking when uncertainty resets is a strong strategic question.']
    ],
    ready:['What a series consists of','How the mechanism fails and what a reset involves','Where the original 75% and 70% figures came from'],
    unknown:['Reset reliability under playoff pressure','Whether the failure persists after a repair attempt','Match-specific opponent changes'],
    prompts:['“If we lose game one, does that tell us something about game two?”','“What really resets between matches?”'],
    records:[
      {id:'d-four',title:'Fragile’s four event records',text:'The mechanism worked in three of its four previously played qualification matches, and failed in one. A full repair took place before the next match.'},
      {id:'d-steady-card',title:'Steady’s archived event summary',text:'Thirty scouted match outcomes are on file; the published win estimate was 70%. The opponents varied substantially.'}
    ],
    investigations:[
      {id:'d-reset',title:'Bench-test the reset procedure',effort:'20 short mechanism operate–reset checks, NOT extra qualification matches',result:'The mechanism worked in 14 of 20 bench checks after resetting, with several back-to-back failures. Bench tests cannot validate a match-win probability directly.'},
      {id:'d-steady',title:'Audit Steady’s existing 30 scouted matches',effort:'Revisit 30 ALREADY-PLAYED matches and tag opponent strength',result:'Steady won 21 of 30 observed matches. Five came against substantially weaker opponents. That context can affect whether the 70% estimate transfers.'},
      {id:'d-fragile',title:'Reconstruct Fragile’s four qualification matches',effort:'Read original match logs and ask the pit crew about the repairs',result:'Of four ALREADY-PLAYED qualification matches, the mechanism worked in three and failed once. The failure required a full repair before the next appearance; there is no evidence for repeated failures in successive matches.'}
    ]
  },
  {
    breakthrough:['How often was each robot defended?','Would either robot crowd our existing scorer’s lane?','Which role do we actually need the third robot to play?'],
    framing:'The scouting averages are real observations *inside this fictional event*, not normalized estimates of robot skill. Echo’s six defended matches and Delta’s easy schedule create meaningful confounding.',
    truth:[
      ['Scouting totals','Delta = 8.0 average in ten matches (e.g. eight 8s, one 7, one 9); Echo = 6.4 average in ten matches.'],
      ['Echo’s observed split','Four undefended matches average 9.5 cycles (38 total); six defended matches average 4.33 (26 total); combined 64/10 = 6.4.'],
      ['Hidden offense models','Delta: ~8.2 undefended cycles, ~7.0 under hard defense; Echo: ~9.0 undefended, ~4.8 defended.'],
      ['Hidden defensive abilities','Delta defense ability = ~55%, Echo = ~15%. Opponent has two strong scorers, so defensive target matters.'],
      ['Hidden failure chances','Delta breakdown ≈3% per match; Echo ≈9% per match. Neither is directly visible in ten matches.'],
      ['Interaction / lanes','Delta overlaps our usual route less than Echo. Unmeasured traffic can cause further lost cycles for both.']
    ],
    ready:['Qualification scorecards for both teams','Which matches involved defense','Our alliance’s scoring and defensive strengths'],
    unknown:['Scoring rates against the *specific* opposing defender','Actual lane conflict with alliance partners','Breakdown chances from so few matches'],
    prompts:['“Are we comparing the same conditions?”','“Which robot fits a role we’re missing?”'],
    records:[
      {id:'e-scores',title:'Both complete qualification scorecards',text:'Delta: eight 8s, one 7, one 9 (80 cycles total). Echo: 9,9,10,10 undefended; 4,4,4,4,5,5 defended (64 total). All ten matches per team are already played.'},
      {id:'e-context',title:'Defense tags from scouts',text:'Six of Echo’s ten matches included heavy defense; Delta rarely faced it. Echo’s raw mean combines different match conditions.'}
    ],
    investigations:[
      {id:'e-lanes',title:'Map lane conflicts from existing match film',effort:'Review the 20 already-scouted videos and overlay robot routes',result:'Echo frequently travels the same side our two scorers prefer. Delta mostly uses a different lane. There is no reliable measured joint-cycle penalty without an actual shared match.'},
      {id:'e-defense',title:'Tag defensive pressure in the existing qualifications',effort:'Rewatch Delta’s and Echo’s ten qualifiers each; mark defenders and routes',result:'Echo’s four undefended scores were 9,9,10,10; its six defended scores were 4,4,4,4,5,5. Delta’s ten scores were eight 8s, one 7, and one 9. There are not twelve more playoff clips to sample.'},
      {id:'e-reliability',title:'Ask both pits about repairs during this event',effort:'Interview pit crews and check inspection notes, without adding matches',result:'Echo had two intake repairs between the ten matches, Delta had one alignment adjustment. Those notes suggest things worth verifying, but do not provide a breakdown probability.'}
    ]
  }
];
