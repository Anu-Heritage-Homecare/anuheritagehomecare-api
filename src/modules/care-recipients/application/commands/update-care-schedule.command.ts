/** Command to record the care schedule captured on the fourth wizard step. */
export interface UpdateCareScheduleCommand {
  ownerId: string;
  careRecipientId: string;
  frequency: string;
  estimatedStartDate: string;
  expectedDuration: string;
}
