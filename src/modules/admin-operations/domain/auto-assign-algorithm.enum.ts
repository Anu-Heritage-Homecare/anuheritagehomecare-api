/** How visits are matched to caregivers when auto assigned. */
export enum AutoAssignAlgorithm {
  ProximityAndSkills = 'PROXIMITY_AND_SKILLS',
  ProximityOnly = 'PROXIMITY_ONLY',
  SkillsOnly = 'SKILLS_ONLY',
  RoundRobin = 'ROUND_ROBIN',
  Manual = 'MANUAL',
}
