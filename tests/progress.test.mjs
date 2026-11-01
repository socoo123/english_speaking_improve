import test from 'node:test';
import assert from 'node:assert/strict';
import { learningProgress } from '../assets/progress.mjs';

const lessons = [{ id: '01', week: 1 }, { id: '02', week: 2 }];
const official = records => ({ learner: { weeks: 26 }, records });

test('only reviewed official passes advance the weekly progress bar', () => {
  assert.deepEqual(learningProgress(lessons, official([
    { lessonId: '01', status: 'passed', reviewedAt: '2026-11-02' },
    { lessonId: '02', status: 'passed', reviewedAt: null }
  ])), { completed: 1, total: 26, percent: 4 });
  assert.equal(learningProgress(lessons, official([
    { lessonId: '01', status: 'needs_practice', reviewedAt: '2026-11-02', total: 90 }
  ])).completed, 0);
});

test('all lessons assigned to one week must pass and a week is counted once', () => {
  const splitWeek = [{ id: '01a', week: 1 }, { id: '01b', week: 1 }];
  const record = lessonId => ({ lessonId, status: 'passed', reviewedAt: '2026-11-02' });
  assert.equal(learningProgress(splitWeek, official([record('01a')])).completed, 0);
  assert.equal(learningProgress(splitWeek, official([record('01a'), record('01b')])).completed, 1);
});

test('unknown lessons and weeks outside the plan cannot inflate progress', () => {
  const invalid = [...lessons, { id: 'future', week: 27 }];
  assert.equal(learningProgress(invalid, official([
    { lessonId: 'unknown', status: 'passed', reviewedAt: '2026-11-02' },
    { lessonId: 'future', status: 'passed', reviewedAt: '2026-11-02' }
  ])).completed, 0);
});
