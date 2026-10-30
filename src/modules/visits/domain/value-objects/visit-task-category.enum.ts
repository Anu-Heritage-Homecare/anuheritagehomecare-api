/**
 * The kind of care activity a visit task represents, driving the admin Care Tasks
 * grouping and icon. Declared in the domain layer, independent of the Prisma enum.
 */
export enum VisitTaskCategory {
  Companionship = 'COMPANIONSHIP',
  PersonalCare = 'PERSONAL_CARE',
  ClinicalVitals = 'CLINICAL_VITALS',
  MedicalSupport = 'MEDICAL_SUPPORT',
  NutritionDietary = 'NUTRITION_DIETARY',
  ReportingAdmin = 'REPORTING_ADMIN',
  General = 'GENERAL',
}
