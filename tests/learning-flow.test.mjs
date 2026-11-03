import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { feedbackTemplate, validateReport, parseReport, gradeQuiz, SCORE_KEYS } from '../assets/report.mjs';

// Synthetic fixtures exercise the gate; these are not learner assessment records.
function syntheticPassingReport() {
  return {
    ...feedbackTemplate('01'), assessedAt: '2026-11-01', mode: 'audio', audioEvidence: true,
    learnerReady: true, unseenScenarios: 2, usedHints: false,
    scores: Object.fromEntries(SCORE_KEYS.map(key => [key, 4])),
    evidence: Object.fromEntries(SCORE_KEYS.map(key => [key, `Synthetic evidence for ${key}`])),
    pronunciationNotes: [{ target: 'clarify', observed: 'Synthetic first-syllable stress observation', correction: '', retest: 'Synthetic novel sentence retest', status: 'verified' }],
    strengths: ['Synthetic task completion'], nextPractice: ['Synthetic follow-up practice'], recommendation: 'pass'
  };
}

test('complete independent audio assessment reaches review eligibility, not an official record', () => {
  const result = validateReport(syntheticPassingReport(), '01');
  assert.equal(result.valid, true);
  assert.equal(result.total, 80);
  assert.equal(result.eligible, true);
});

test('text-only assessment remains useful without inventing fluency or pronunciation', () => {
  const report = { ...feedbackTemplate('01'), assessedAt: '2026-11-01' };
  for (const key of ['task', 'interaction', 'language']) { report.scores[key] = 4; report.evidence[key] = 'Synthetic written interaction'; }
  const result = validateReport(report, '01');
  assert.equal(result.valid, true);
  assert.equal(result.total, null);
  assert.equal(result.eligible, false);
  report.scores.pronunciation = 4;
  report.evidence.pronunciation = 'Unsupported inference from transcription';
  assert.equal(validateReport(report, '01').valid, false);
});

test('a claimed voice session without actual audio evidence cannot score oral performance', () => {
  const report = syntheticPassingReport();
  report.audioEvidence = false;
  assert.equal(validateReport(report, '01').valid, false);
});

test('high scores do not bypass consent, independence or unseen-scenario requirements', () => {
  for (const change of [{ learnerReady: false }, { usedHints: true }, { unseenScenarios: 1 }]) {
    const result = validateReport({ ...syntheticPassingReport(), ...change }, '01');
    assert.equal(result.valid, false);
    assert.equal(result.eligible, false);
  }
});

test('missing evidence and unresolved pronunciation prevent a passing recommendation', () => {
  for (const mutate of [report => { report.evidence.task = ''; }, report => { report.pronunciationNotes = []; }, report => { report.pronunciationNotes[0].status = 'improving'; }, report => { report.pronunciationNotes[0].retest = ''; }]) {
    const report = syntheticPassingReport(); mutate(report);
    assert.equal(validateReport(report, '01').valid, false);
  }
});

test('a high overall score cannot hide a weak pronunciation result', () => {
  const report = syntheticPassingReport();
  report.scores = { task: 5, interaction: 5, language: 5, fluency: 5, pronunciation: 3 };
  assert.equal(validateReport(report, '01').valid, false);
  report.recommendation = 'practice';
  const result = validateReport(report, '01');
  assert.equal(result.valid, true);
  assert.equal(result.total, 92);
  assert.equal(result.eligible, false);
});

test('wrong lesson, impossible dates, out-of-range scores and malformed input are rejected', () => {
  const base = syntheticPassingReport();
  assert.equal(validateReport(base, '02').valid, false);
  assert.equal(validateReport({ ...base, assessedAt: '2026-02-30' }, '01').valid, false);
  assert.equal(validateReport({ ...base, scores: { ...base.scores, language: 6 } }, '01').valid, false);
  assert.equal(parseReport('not json', '01').valid, false);
  assert.equal(parseReport('null', '01').valid, false);
  assert.equal(parseReport('{}', '01').valid, false);
});

test('a copied JSON code fence is accepted without accepting surrounding prose', () => {
  const report = JSON.stringify(syntheticPassingReport());
  assert.equal(parseReport('```json\n' + report + '\n```', '01').valid, true);
  assert.equal(parseReport('Here is your report: ' + report, '01').valid, false);
});

test('quiz distinguishes skipped, incorrect and correct answers, with normalized fill-in input', async () => {
  const [lesson] = JSON.parse(await readFile(new URL('../data/lessons.json', import.meta.url)));
  const results = gradeQuiz(lesson.quiz, { q1: '0', q2: '0', q3: ' AT ', q4: 'to', q5: '', q6: '1' });
  assert.equal(results.filter(result => result.correct).length, 4);
  assert.equal(results.find(result => result.id === 'q2').answered, true);
  assert.equal(results.find(result => result.id === 'q5').answered, false);
  assert.equal(gradeQuiz(lesson.quiz, {}).some(result => result.correct), false);
});

test('course sources remain explicit and official results remain genuinely unassessed', async () => {
  const lessons = JSON.parse(await readFile(new URL('../data/lessons.json', import.meta.url)));
  const progress = JSON.parse(await readFile(new URL('../data/progress.json', import.meta.url)));
  const ids = new Set(lessons.map(lesson => lesson.id));
  assert.equal(ids.size, lessons.length);
  for (const lesson of lessons) {
    assert.ok(lesson.goals.length && lesson.pronunciationTargets.length && lesson.practiceScenarios.length && lesson.assessmentFocus);
    if (lesson.source.status !== 'verified') assert.equal(lesson.source.youtubeId, null);
  }
  for (const record of progress.records) {
    assert.ok(ids.has(record.lessonId));
    if (record.status === 'not_assessed') { assert.equal(record.scores, null); assert.equal(record.total, null); }
  }
});
