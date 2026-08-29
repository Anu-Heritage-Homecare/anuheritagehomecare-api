import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildZip, crc32 } from './zip-archive';

function unzipAvailable(): boolean {
  try {
    execFileSync('unzip', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('zip-archive', () => {
  it('computes the standard CRC 32 check value', () => {
    // The canonical CRC 32 test vector: "123456789" -> 0xCBF43926.
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });

  it('writes a well formed archive with the expected signatures and count', () => {
    const zip = buildZip([
      { name: 'a.txt', data: Buffer.from('hello') },
      { name: 'b.txt', data: Buffer.from('world') },
    ]);

    // Local file header and end of central directory signatures.
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
    // Total entries recorded in the end of central directory record.
    expect(zip.readUInt16LE(zip.length - 12)).toBe(2);
    // Stored (uncompressed) bytes appear verbatim.
    expect(zip.includes(Buffer.from('hello'))).toBe(true);
    expect(zip.includes(Buffer.from('world'))).toBe(true);
  });

  const itWithUnzip = unzipAvailable() ? it : it.skip;
  itWithUnzip('produces an archive the system unzip can extract', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zip-test-'));
    try {
      const zip = buildZip([
        { name: 'note.txt', data: Buffer.from('care note contents') },
        { name: 'photo.bin', data: Buffer.from([0, 1, 2, 3, 255, 254]) },
      ]);
      const zipPath = join(dir, 'out.zip');
      writeFileSync(zipPath, zip);

      execFileSync('unzip', ['-o', zipPath, '-d', dir]);

      expect(readFileSync(join(dir, 'note.txt')).toString()).toBe('care note contents');
      expect([...readFileSync(join(dir, 'photo.bin'))]).toEqual([0, 1, 2, 3, 255, 254]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
