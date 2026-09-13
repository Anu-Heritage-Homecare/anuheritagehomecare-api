/**
 * The kind of document held for a care recipient. Drives the category tabs and
 * counts on the admin Documents screen.
 */
export enum DocumentCategory {
  MedicalRecords = 'MEDICAL_RECORDS',
  CarePlans = 'CARE_PLANS',
  Legal = 'LEGAL',
  Insurance = 'INSURANCE',
  Certifications = 'CERTIFICATIONS',
  Photos = 'PHOTOS',
}

/** Every valid category, used to validate incoming values at the boundary. */
export const ALL_DOCUMENT_CATEGORIES: readonly DocumentCategory[] = Object.values(DocumentCategory);
