/**
 * Lifecycle of an operational task. OPEN and IN_PROGRESS both count as open work
 * on the dashboard; DONE is terminal.
 */
export enum TaskStatus {
  Open = 'OPEN',
  InProgress = 'IN_PROGRESS',
  Done = 'DONE',
}
