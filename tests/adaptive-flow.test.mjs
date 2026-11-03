import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveFeedbackTemplate, validateReport } from '../assets/report.mjs';
import { learningProgress, weekDates } from '../assets/progress.mjs';

const observed = () => ({ ...adaptiveFeedbackTemplate('01', { watched: true, difficulty: 'hard', captions: 'en', playbackRate: 1 }), assessedAt: '2026-11-03', recommendation: 'easier', adjustmentReason: 'Learner understood the story but needed sentence starters to describe a project.', evidence: { task: 'Needed a sentence starter to describe a project.', interaction: '', language: '', fluency: '', pronunciation: '' }, usedHints: true });

test('a supported adjustment needs neither a passing score nor completion confirmation', () => {
  const report = observed();
  const result = validateReport(report, '01');
  assert.equal(result.valid, true);
  assert.equal(result.total, null);
  assert.equal(result.eligible, false);
  assert.equal(report.learnerConfirmed, false);
});

test('adjustments require watching, self-rating, dialogue evidence and a reason', () => {
  for (const change of [r => { r.learnerFeedback.watched = false; }, r => { r.learnerFeedback.difficulty = null; }, r => { r.evidence.task = ''; }, r => { r.adjustmentReason = ''; }]) {
    const report = observed(); change(report);
    assert.equal(validateReport(report, '01').valid, false);
  }
  const incomplete = { ...adaptiveFeedbackTemplate('01'), assessedAt: '2026-11-03' };
  assert.equal(validateReport(incomplete, '01').valid, true);
});

test('adaptive reports preserve audio honesty and validate viewing conditions', () => {
  for (const change of [r => { r.scores.pronunciation = 4; r.evidence.pronunciation = 'Text looked good'; }, r => { r.audioEvidence = true; }, r => { r.learnerFeedback.playbackRate = -1; }, r => { r.learnerFeedback.captions = 'unknown'; }, r => { r.recommendation = 'pass'; }]) {
    const report = observed(); change(report);
    assert.equal(validateReport(report, '01').valid, false);
  }
});

test('week zero and final week count only after review; dates alone never complete weeks', () => {
  const lessons = [{ id: '01', week: 0 }, { id: 'last', week: 25 }, { id: 'outside', week: 26 }];
  const record = (lessonId, reviewedAt) => ({ lessonId, status: 'completed', reviewedAt });
  const progress = { learner: { weeks: 26 }, records: [record('01', null), record('last', '2027-05-02'), record('outside', '2027-05-09')] };
  assert.equal(learningProgress(lessons, progress).completed, 1);
  progress.records[0].reviewedAt = '2026-11-08';
  assert.equal(learningProgress(lessons, progress).completed, 2);
  assert.equal(weekDates('2026-11-02', 0), '2026-11-02 — 2026-11-08');
  assert.equal(weekDates('2026-11-02', 25), '2027-04-26 — 2027-05-02');
  assert.equal(weekDates('2026-11-03', 0), '');
});
