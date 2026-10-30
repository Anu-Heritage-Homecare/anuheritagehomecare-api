import { TaskTemplate } from '../../domain/task-template.entity';

export interface TaskTemplateResult {
  id: string;
  name: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  defaultAssigneeLabel: string | null;
  checklistItems: string[];
  scheduleLabel: string | null;
  estimatedMinutes: number | null;
  active: boolean;
}

export function toTaskTemplateResult(template: TaskTemplate): TaskTemplateResult {
  return {
    id: template.id,
    name: template.name,
    title: template.title,
    description: template.description,
    category: String(template.category),
    priority: String(template.priority),
    defaultAssigneeLabel: template.defaultAssigneeLabel,
    checklistItems: template.checklistItems,
    scheduleLabel: template.scheduleLabel,
    estimatedMinutes: template.estimatedMinutes,
    active: template.active,
  };
}
