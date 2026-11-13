import { buildPdf, PdfText } from '@shared/infrastructure/pdf/pdf-document';
import { OrganizationResult } from '../../application/dto/organization.result';

const LEFT = 50;
const COL2 = 250;

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Format minutes from midnight as a 12 hour clock time (e.g. 540 becomes 9:00 AM). */
function clock(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/** Render the whole Organization Profile to a PDF (the Export Systems PDF action). */
export function buildOrganizationSystemsPdf(report: OrganizationResult): {
  filename: string;
  pdf: Buffer;
} {
  const runs: PdfText[] = [];
  const line = (
    x: number,
    y: number,
    text: string,
    size = 10,
    font: PdfText['font'] = 'regular',
  ): void => {
    runs.push({ x, y, text, size, font });
  };

  line(LEFT, 800, report.legalName ?? 'Organization Profile', 20, 'bold');
  line(LEFT, 780, 'Systems Report', 10);

  let y = 752;
  const field = (label: string, value: string | null): void => {
    line(LEFT, y, label, 10);
    line(COL2, y, value ?? '—', 10, 'bold');
    y -= 15;
  };

  line(LEFT, y, 'Profile Details', 12, 'bold');
  y -= 16;
  field('Business Reg', report.businessRegNumber);
  field('Registered Address', report.registeredAddress);
  field('Timezone', report.timezone);
  field('System Language', report.systemLanguage);
  field('System Currency', report.currency);
  field('Date Format', report.dateFormat);
  y -= 8;

  line(LEFT, y, 'Business Hours', 12, 'bold');
  y -= 16;
  for (const day of report.businessHours) {
    const value = day.isOpen ? `${clock(day.openMinute)} - ${clock(day.closeMinute)}` : 'Closed';
    line(LEFT, y, DAY_LABELS[day.dayOfWeek] ?? `Day ${day.dayOfWeek}`, 10);
    line(COL2, y, value, 10, 'bold');
    y -= 14;
  }
  y -= 8;

  line(LEFT, y, `Branches (${report.branches.length})`, 12, 'bold');
  y -= 16;
  for (const branch of report.branches) {
    const address = [branch.addressLine1, branch.addressLine2, branch.city, branch.state]
      .filter(Boolean)
      .join(', ');
    line(LEFT, y, branch.name, 10);
    line(COL2, y, `${address} (${branch.status})`, 9, 'bold');
    y -= 14;
  }
  y -= 8;

  line(LEFT, y, `Emergency Contacts (${report.emergencyContacts.length})`, 12, 'bold');
  y -= 16;
  for (const contact of report.emergencyContacts) {
    line(LEFT, y, contact.name, 10);
    line(COL2, y, `${contact.role ?? ''} ${contact.phone}`.trim(), 9, 'bold');
    y -= 14;
  }

  return { filename: 'organization-systems-report.pdf', pdf: buildPdf(runs) };
}
