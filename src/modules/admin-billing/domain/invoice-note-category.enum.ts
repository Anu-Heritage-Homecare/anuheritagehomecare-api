/** How an internal invoice note is classified on the Notes tab. */
export enum InvoiceNoteCategory {
  General = 'GENERAL',
  FollowUp = 'FOLLOW_UP',
  System = 'SYSTEM',
  InvoiceAudit = 'INVOICE_AUDIT',
}

export const ALL_INVOICE_NOTE_CATEGORIES: InvoiceNoteCategory[] =
  Object.values(InvoiceNoteCategory);
