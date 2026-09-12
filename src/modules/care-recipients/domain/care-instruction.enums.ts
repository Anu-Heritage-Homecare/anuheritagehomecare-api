/** Which column a care instruction belongs to on the care plan. */
export enum CareInstructionCategory {
  Medical = 'MEDICAL',
  Behavioral = 'BEHAVIORAL',
}

/** How prominently a care instruction is flagged to caregivers. */
export enum CareInstructionSeverity {
  Critical = 'CRITICAL',
  Warning = 'WARNING',
  Normal = 'NORMAL',
}
