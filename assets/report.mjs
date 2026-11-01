export const SCORE_KEYS = ['task', 'interaction', 'language', 'fluency', 'pronunciation'];
export const SCORE_LABELS = { task: '任务完成', interaction: '互动理解', language: '语言运用', fluency: '口语流畅度', pronunciation: '发音' };

export function feedbackTemplate(lessonId) {
  return {
    schemaVersion: 1, lessonId, assessedAt: '', mode: 'text', audioEvidence: false,
    learnerReady: false, unseenScenarios: 0, usedHints: false,
    scores: Object.fromEntries(SCORE_KEYS.map(key => [key, null])),
    evidence: Object.fromEntries(SCORE_KEYS.map(key => [key, ''])),
    pronunciationNotes: [], strengths: [], nextPractice: [], recommendation: 'incomplete'
  };
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(nonempty);

export function validateReport(report, lessonId) {
  const errors = [];
  if (!object(report)) return { valid: false, errors: ['报告必须是 JSON 对象。'], total: null, eligible: false };
  if (report.schemaVersion !== 1) errors.push('schemaVersion 必须为 1。');
  if (report.lessonId !== lessonId) errors.push('lessonId 与当前课程不一致。');
  const date = report.assessedAt;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) errors.push('请填写有效测评日期 YYYY-MM-DD。');
  if (!['audio', 'text'].includes(report.mode)) errors.push('mode 必须为 audio 或 text。');
  for (const key of ['audioEvidence', 'learnerReady', 'usedHints']) {
    if (typeof report[key] !== 'boolean') errors.push(`${key} 必须为 true 或 false。`);
  }
  if (!Number.isInteger(report.unseenScenarios) || report.unseenScenarios < 0) errors.push('unseenScenarios 必须为非负整数。');
  if (!object(report.scores)) errors.push('缺少 scores 对象。');
  if (!object(report.evidence)) errors.push('缺少 evidence 对象。');
  for (const key of SCORE_KEYS) {
    const score = report.scores?.[key];
    if (score !== null && (!Number.isInteger(score) || score < 0 || score > 5)) errors.push(`${SCORE_LABELS[key]}分数须为 0—5 整数或 null。`);
    if (typeof report.evidence?.[key] !== 'string') errors.push(`${SCORE_LABELS[key]}须有 evidence 字符串。`);
    else if (score !== null && score !== undefined && !nonempty(report.evidence[key])) errors.push(`${SCORE_LABELS[key]}有分数但缺少具体证据。`);
  }
  const hasAudio = report.mode === 'audio' && report.audioEvidence === true;
  if (report.mode === 'text' && report.audioEvidence === true) errors.push('文字模式不能声明已分析原始音频。');
  if (!hasAudio && (report.scores?.pronunciation !== null || report.scores?.fluency !== null)) errors.push('未分析真实音频时，发音和口语流畅度必须为 null。');
  if (!Array.isArray(report.pronunciationNotes)) errors.push('pronunciationNotes 必须为数组。');
  else {
    if (!hasAudio && report.pronunciationNotes.length) errors.push('无真实音频依据时不能记录已观察的发音问题。');
    for (const note of report.pronunciationNotes) {
      if (!object(note) || !['target', 'observed', 'correction', 'retest'].every(key => typeof note[key] === 'string') || !['resolved', 'improving', 'unresolved', 'verified'].includes(note.status)) errors.push('发音记录须包含 target、observed、correction、retest 字符串及有效 status。');
    }
  }
  if (!strings(report.strengths)) errors.push('strengths 必须是非空字符串组成的数组（允许空数组）。');
  if (!strings(report.nextPractice)) errors.push('nextPractice 必须是非空字符串组成的数组（允许空数组）。');
  if (!['pass', 'practice', 'incomplete'].includes(report.recommendation)) errors.push('recommendation 必须为 pass、practice 或 incomplete。');
  const complete = SCORE_KEYS.every(key => Number.isInteger(report.scores?.[key]) && report.scores[key] >= 0 && report.scores[key] <= 5);
  const total = complete ? SCORE_KEYS.reduce((sum, key) => sum + report.scores[key], 0) * 4 : null;
  const pronunciationVerified = Array.isArray(report.pronunciationNotes) && report.pronunciationNotes.length > 0 && report.pronunciationNotes.every(note => object(note) && ['resolved', 'verified'].includes(note.status) && ['target', 'observed', 'retest'].every(key => nonempty(note[key])) && (note.status !== 'resolved' || nonempty(note.correction)));
  const eligible = errors.length === 0 && hasAudio && report.learnerReady && !report.usedHints && report.unseenScenarios >= 2 && complete && total >= 80 && SCORE_KEYS.every(key => report.scores[key] >= 3) && report.scores.task >= 4 && report.scores.pronunciation >= 4 && pronunciationVerified;
  if (report.recommendation === 'pass' && !eligible) errors.push('过关建议与条件不符：需本人确认、真实音频、至少两个新场景、无辅导提示、完整评分达标，以及已稳定的发音复测证据。');
  return { valid: errors.length === 0, errors, total: errors.length ? null : total, eligible: errors.length === 0 && eligible };
}

export function parseReport(text, lessonId) {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, '$1');
    const report = JSON.parse(cleaned);
    return { report, ...validateReport(report, lessonId) };
  } catch {
    return { report: null, valid: false, errors: ['无法解析 JSON。请粘贴完整报告，可包含一个 JSON 代码块。'], total: null, eligible: false };
  }
}

export function gradeQuiz(quiz, responses) {
  return quiz.map(question => {
    const response = responses[question.id];
    const answered = typeof response === 'string' && response.trim() !== '';
    const correct = answered && (question.type === 'choice'
      ? response === String(question.answer)
      : question.answers.some(answer => answer.toLowerCase() === response.trim().toLowerCase()));
    return { id: question.id, correct: Boolean(correct), answered, explanation: question.explanation };
  });
}
