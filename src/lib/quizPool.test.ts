// Guards the quiz question pool against the two failure modes that can take
// the whole quiz down:
//
//  1. buildWeightedQuestions() in LocationQuiz.tsx does
//     `byDiff[q.difficulty].push(q)` with no guard, so a single question with a
//     missing or misspelled difficulty is an `undefined.push()` — it throws and
//     the quiz can't be generated at all.
//  2. The answered-question filter keys on `q.id`. Duplicate ids across the ~20
//     question files silently shrink the playable pool, and a big enough
//     overlap can starve a difficulty bucket.
//
// Both are the kind of thing a bulk question-file upload introduces by
// accident, so this runs over the real pool rather than a fixture.
import { describe, it, expect } from 'vitest';
import { knowledgeQuestions, roadMarkingsQuestions, type QuizQuestion } from './quizData';
import { trafficQuestions } from './trafficQuestions';
import { trafficQuestions2 } from './trafficQuestions2';
import { trafficQuestions3 } from './trafficQuestions3';
import { extraRoadQuestions } from './extraQuestions';
import { extraRoadQuestions2 } from './extraQuestions2';
import { bulkRoadQuestions } from './extraQuestions3';
import { roadQuestions4 } from './roadQuestions4';
import { roadQuestions5 } from './roadQuestions5';
import { roadQuestions6 } from './roadQuestions6';
import { roadQuestions7 } from './roadQuestions7';
import { trafficQuestions7 } from './trafficQuestions7';
import { hardQuizQuestions } from './hardQuestions';
import { hardQuestions2 } from './hardQuestions2';
import { hardQuestions3 } from './hardQuestions3';
import { mediumQuestions } from './mediumQuestions';
import { easyQuestions } from './easyQuestions';
import { economicsQuestions } from './economicsQuestions';
import { imageRoadQuestions, imageLandmarkQuestions, type ImageQuizQuestion } from './quizImages';
import { imageRoadQuestions2 } from './imageRoadQuestions2';
import { imageRoadQuestions3 } from './imageRoadQuestions3';
import { imageRoadQuestions4 } from './imageRoadQuestions4';

type AnyQuestion = QuizQuestion | ImageQuizQuestion;

const files: Record<string, AnyQuestion[]> = {
  knowledgeQuestions, roadMarkingsQuestions, trafficQuestions, trafficQuestions2,
  trafficQuestions3, extraRoadQuestions, extraRoadQuestions2, bulkRoadQuestions,
  roadQuestions4, roadQuestions5, roadQuestions6, roadQuestions7, trafficQuestions7,
  hardQuizQuestions, hardQuestions2, hardQuestions3, mediumQuestions, easyQuestions,
  economicsQuestions, imageRoadQuestions, imageLandmarkQuestions, imageRoadQuestions2,
  imageRoadQuestions3, imageRoadQuestions4,
};

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const entries = Object.entries(files);
const allQuestions = entries.flatMap(([file, list]) =>
  (Array.isArray(list) ? list : []).map((q, i) => ({ q, where: `${file}[${i}] id=${q?.id ?? '<none>'}` })),
);

describe('quiz question pool', () => {
  // LocationQuiz.tsx spreads every one of these into allQuestionPool at module
  // scope. An export that's undefined (renamed, or removed from its file) makes
  // that spread throw while the lazy chunk is still initialising, which takes
  // the whole quiz down before it can render anything. An intentionally empty
  // array is fine — extraRoadQuestions2 is currently an empty stub.
  it('every question file exports an array (undefined would crash the pool spread)', () => {
    const bad = entries.filter(([, list]) => !Array.isArray(list));
    expect(bad.map(([name]) => name)).toEqual([]);
  });

  it('every question has a difficulty buildWeightedQuestions can bucket', () => {
    const bad = allQuestions
      .filter(({ q }) => !VALID_DIFFICULTIES.includes((q as AnyQuestion).difficulty))
      .map(({ q, where }) => `${where} difficulty=${JSON.stringify((q as AnyQuestion).difficulty)}`);
    expect(bad).toEqual([]);
  });

  it('every question has an id', () => {
    expect(allQuestions.filter(({ q }) => !q?.id).map(({ where }) => where)).toEqual([]);
  });

  it('question ids are unique across every file', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const { q, where } of allQuestions) {
      if (!q?.id) continue;
      const first = seen.get(q.id);
      if (first) dupes.push(`"${q.id}" in ${where} (first seen in ${first})`);
      else seen.set(q.id, where);
    }
    expect(dupes).toEqual([]);
  });

  it('every question has at least two options and an in-range correctAnswer', () => {
    const bad = allQuestions
      .filter(({ q }) => {
        const opts = (q as AnyQuestion).options;
        if (!Array.isArray(opts) || opts.length < 2) return true;
        const a = (q as AnyQuestion).correctAnswer;
        return typeof a !== 'number' || a < 0 || a >= opts.length;
      })
      .map(({ where }) => where);
    expect(bad).toEqual([]);
  });

  it('has enough questions in every difficulty to fill a 10-question game', () => {
    const counts = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
    for (const { q } of allQuestions) {
      const d = (q as AnyQuestion).difficulty;
      if (VALID_DIFFICULTIES.includes(d)) counts[d]++;
    }
    // A game asks for 1 easy / 4 medium / 5 hard at the current weights.
    expect(counts.easy).toBeGreaterThanOrEqual(1);
    expect(counts.medium).toBeGreaterThanOrEqual(4);
    expect(counts.hard).toBeGreaterThanOrEqual(5);
  });
});
