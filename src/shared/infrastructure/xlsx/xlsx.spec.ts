import { buildXlsx } from './xlsx';

describe('buildXlsx', () => {
  it('produces a zip workbook with the required parts and cell data', () => {
    const buffer = buildXlsx('Report', [
      ['Name', 'Amount'],
      ['Total Revenue', 45230],
    ]);
    // A .xlsx is a zip; the store method keeps the XML readable in the buffer.
    expect(buffer.slice(0, 2).toString('latin1')).toBe('PK');
    const text = buffer.toString('latin1');
    expect(text).toContain('[Content_Types].xml');
    expect(text).toContain('xl/worksheets/sheet1.xml');
    expect(text).toContain('<sheet name="Report"');
    // Inline string cell and numeric cell.
    expect(text).toContain('<t xml:space="preserve">Total Revenue</t>');
    expect(text).toContain('<v>45230</v>');
  });

  it('escapes XML special characters in strings', () => {
    const text = buildXlsx('S', [['Okafor & <Sons>']]).toString('latin1');
    expect(text).toContain('Okafor &amp; &lt;Sons&gt;');
  });

  it('uses A1-style references across columns', () => {
    const text = buildXlsx('S', [['a', 'b', 'c']]).toString('latin1');
    expect(text).toContain('r="A1"');
    expect(text).toContain('r="C1"');
  });
});
