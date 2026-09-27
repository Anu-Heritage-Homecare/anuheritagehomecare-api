/** The category an employment document is filed under on the Documents tab. */
export enum CaregiverDocumentCategory {
  Legal = 'LEGAL',
  Tax = 'TAX',
  Payroll = 'PAYROLL',
  Hr = 'HR',
  Other = 'OTHER',
}

export const ALL_CAREGIVER_DOCUMENT_CATEGORIES: CaregiverDocumentCategory[] =
  Object.values(CaregiverDocumentCategory);
