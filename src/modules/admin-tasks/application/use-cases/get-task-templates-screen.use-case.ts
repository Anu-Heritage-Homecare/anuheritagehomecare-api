import { Inject, Injectable } from '@nestjs/common';
import { TaskTemplate } from '../../domain/task-template.entity';
import {
  TASK_TEMPLATE_REPOSITORY,
  TaskTemplateRepository,
} from '../../domain/task-template.repository';
import { TaskTemplatesScreenResult } from '../dto/task-templates-screen.result';
import { categoryLabel } from '../tasks.presenter';

export type TemplateStatusFilter = 'ACTIVE' | 'INACTIVE';

export interface TaskTemplatesScreenQuery {
  category?: string | null;
  status?: TemplateStatusFilter | null;
  search?: string | null;
}

/** Use case: the Task Templates screen (KPIs and the filtered template cards). */
@Injectable()
export class GetTaskTemplatesScreenUseCase {
  constructor(
    @Inject(TASK_TEMPLATE_REPOSITORY) private readonly templates: TaskTemplateRepository,
  ) {}

  async execute(query: TaskTemplatesScreenQuery = {}): Promise<TaskTemplatesScreenResult> {
    const all = await this.templates.list();
    const active = all.filter((t) => t.active);

    const search = query.search?.trim().toLowerCase() ?? null;
    const wantActive =
      query.status === undefined || query.status === null ? true : query.status === 'ACTIVE';
    const filtered = all.filter((t) => {
      if (t.active !== wantActive) {
        return false;
      }
      if (query.category != null && String(t.category) !== query.category) {
        return false;
      }
      if (search !== null && !this.matchesSearch(t, search)) {
        return false;
      }
      return true;
    });

    return {
      kpis: {
        activeTemplates: active.length,
        operations: new Set(active.map((t) => String(t.category))).size,
        tasksGeneratedThisWeek: null,
        avgCompletionRatePercent: null,
      },
      templates: filtered.map((t) => ({
        id: t.id,
        name: t.name,
        category: String(t.category),
        categoryLabel: categoryLabel(String(t.category)),
        description: t.description,
        itemCount: t.checklistItems.length,
        estimatedMinutes: t.estimatedMinutes,
        scheduleLabel: t.scheduleLabel,
        assigneeLabel: t.defaultAssigneeLabel,
        active: t.active,
        tasksGenerated: null,
        completionRatePercent: null,
      })),
    };
  }

  private matchesSearch(template: TaskTemplate, search: string): boolean {
    return (
      template.name.toLowerCase().includes(search) ||
      template.title.toLowerCase().includes(search) ||
      (template.description?.toLowerCase().includes(search) ?? false)
    );
  }
}
