/**
 * How a care goal is tracking, set by the office (independent of the raw progress
 * percentage: a goal at 92 percent can still need attention). Drives the Status
 * badge on the admin care plan.
 */
export enum CareGoalStatus {
  OnTrack = 'ON_TRACK',
  NeedsAttention = 'NEEDS_ATTENTION',
  AtRisk = 'AT_RISK',
  Achieved = 'ACHIEVED',
}
