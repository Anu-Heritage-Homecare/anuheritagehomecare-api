export interface CarePlanGoalResult {
  label: string;
  progressPercent: number;
  status: string;
}

export interface CarePlanScheduleBlockResult {
  startMinute: number;
  title: string;
  description: string;
}

export interface CarePlanInstructionResult {
  text: string;
  severity: string;
}

export interface CarePlanRevisionResult {
  at: Date;
  description: string;
  authorName: string | null;
}

export interface CarePlanResult {
  goals: CarePlanGoalResult[];
  schedule: CarePlanScheduleBlockResult[];
  instructions: {
    medical: CarePlanInstructionResult[];
    behavioral: CarePlanInstructionResult[];
  };
  revisions: CarePlanRevisionResult[];
}
