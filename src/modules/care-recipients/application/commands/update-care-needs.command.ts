/** Command to record the care needs selected on the second wizard step. */
export interface UpdateCareNeedsCommand {
  ownerId: string;
  careRecipientId: string;
  careNeeds: string[];
}
