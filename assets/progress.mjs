// Only reviewed official records count. Browser drafts never enter this calculation.
export function learningProgress(lessons, progress) {
  const total = Number.isInteger(progress.learner?.weeks) && progress.learner.weeks > 0 ? progress.learner.weeks : 26;
  const weeks = new Map();
  for (const lesson of lessons) {
    if (!Number.isInteger(lesson.week) || lesson.week < 0 || lesson.week >= total) continue;
    const record = progress.records.find(item => item.lessonId === lesson.id);
    const passed = ['completed', 'passed'].includes(record?.status) && Boolean(record.reviewedAt);
    weeks.set(lesson.week, (weeks.get(lesson.week) ?? true) && passed);
  }
  const completed = [...weeks.values()].filter(Boolean).length;
  return { completed, total, percent: Math.round(completed / total * 100) };
}

// Calendar labels never advance learning progress. Week zero starts on a Monday.
export function weekDates(startDate, week) {
  const start = new Date(`${startDate}T00:00:00Z`);
  if (!Number.isInteger(week) || week < 0 || !Number.isFinite(start.getTime()) || start.getUTCDay() !== 1) return '';
  start.setUTCDate(start.getUTCDate() + week * 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${start.toISOString().slice(0, 10)} — ${end.toISOString().slice(0, 10)}`;
}
