/** The kind of operational task. Placeholder option set pending the real list. */
export enum TaskCategory {
  CareActivity = 'CARE_ACTIVITY',
  Medication = 'MEDICATION',
  Documentation = 'DOCUMENTATION',
  Scheduling = 'SCHEDULING',
  Compliance = 'COMPLIANCE',
  Administrative = 'ADMINISTRATIVE',
  Other = 'OTHER',
}

/** The human label for a task category, e.g. "Care Activity". */
export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  [TaskCategory.CareActivity]: 'Care Activity',
  [TaskCategory.Medication]: 'Medication',
  [TaskCategory.Documentation]: 'Documentation',
  [TaskCategory.Scheduling]: 'Scheduling',
  [TaskCategory.Compliance]: 'Compliance',
  [TaskCategory.Administrative]: 'Administrative',
  [TaskCategory.Other]: 'Other',
};
