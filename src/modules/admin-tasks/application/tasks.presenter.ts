import { TASK_CATEGORY_LABELS, TaskCategory } from '../domain/task-category.enum';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// shortcut: "Critical" is URGENT and "Normal" is not a distinct task priority (the
// mockup shows it; it collapses to Medium here). Revisit if the real set differs.
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Critical',
};

export function priorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function categoryLabel(category: string): string {
  return TASK_CATEGORY_LABELS[category as TaskCategory] ?? category;
}

/** Whether a task is overdue: due before today and not yet done. */
export function isOverdue(dueAt: Date | null, status: string, now: Date): boolean {
  if (dueAt === null || status === 'DONE') {
    return false;
  }
  return dueAt.getTime() < startOfUtcDay(now);
}

/** The status badge, which reads "Overdue" when past due, else the lifecycle label. */
export function statusLabel(status: string, dueAt: Date | null, now: Date): string {
  if (isOverdue(dueAt, status, now)) {
    return 'Overdue';
  }
  switch (status) {
    case 'OPEN':
      return 'Pending';
    case 'IN_PROGRESS':
      return 'In Progress';
    default:
      return 'Completed';
  }
}

/** "Today, 10:00 AM", "Yesterday", "Tomorrow" or "July 22". */
export function dueDateLabel(dueAt: Date | null, now: Date): string | null {
  if (dueAt === null) {
    return null;
  }
  const dayDiff = Math.round((startOfUtcDay(dueAt) - startOfUtcDay(now)) / 86_400_000);
  if (dayDiff === 0) {
    return `Today, ${clockLabel(dueAt)}`;
  }
  if (dayDiff === -1) {
    return 'Yesterday';
  }
  if (dayDiff === 1) {
    return 'Tomorrow';
  }
  return `${MONTHS[dueAt.getUTCMonth()]} ${dueAt.getUTCDate()}`;
}

/** The Related Visit column label, e.g. "Morning Care Visit". */
export function relatedVisitLabel(visitType: string | null): string | null {
  if (visitType === null) {
    return null;
  }
  return `${titleCase(visitType)} Visit`;
}

export function completionRatePercent(completedTotal: number, totalTasks: number): number {
  if (totalTasks === 0) {
    return 0;
  }
  return Math.round((completedTotal / totalTasks) * 100);
}

/** "July 20, 2026". */
export function longDateLabel(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** A minute of the day (0 to 1439) as "8:00 AM". */
export function minuteLabel(minuteOfDay: number): string {
  const hours24 = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function clockLabel(date: Date): string {
  const hours24 = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function titleCase(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function startOfUtcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}
