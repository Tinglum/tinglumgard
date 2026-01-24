export function getWeekNumber(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

export function isBeforeCutoff(
  cutoffYear: number,
  cutoffWeek: number,
  currentDate: Date = new Date()
): boolean {
  const current = getWeekNumber(currentDate);

  if (current.year < cutoffYear) return true;
  if (current.year > cutoffYear) return false;

  return current.week <= cutoffWeek;
}
