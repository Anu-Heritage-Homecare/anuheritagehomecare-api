export interface TaskTemplatesKpisResult {
  activeTemplates: number;
  operations: number;
  // Deferred: these depend on a task generation scheduler and historical data we
  // do not have yet, so they are null until that exists.
  tasksGeneratedThisWeek: number | null;
  avgCompletionRatePercent: number | null;
}

export interface TaskTemplateCardResult {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string | null;
  itemCount: number;
  estimatedMinutes: number | null;
  scheduleLabel: string | null;
  assigneeLabel: string | null;
  active: boolean;
  // Deferred alongside the KPIs above.
  tasksGenerated: number | null;
  completionRatePercent: number | null;
}

export interface TaskTemplatesScreenResult {
  kpis: TaskTemplatesKpisResult;
  templates: TaskTemplateCardResult[];
}
