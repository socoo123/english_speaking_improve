// Only reviewed official records count. Browser drafts never enter this calculation.
export function learningProgress(lessons, progress) {
  const total = Number.isInteger(progress.learner?.weeks) && progress.learner.weeks > 0 ? progress.learner.weeks : 26;
  const weeks = new Map();
  for (const lesson of lessons) {
    if (!Number.isInteger(lesson.week) || lesson.week < 1 || lesson.week > total) continue;
    const record = progress.records.find(item => item.lessonId === lesson.id);
    const passed = record?.status === 'passed' && Boolean(record.reviewedAt);
    weeks.set(lesson.week, (weeks.get(lesson.week) ?? true) && passed);
  }
  const completed = [...weeks.values()].filter(Boolean).length;
  return { completed, total, percent: Math.round(completed / total * 100) };
}
