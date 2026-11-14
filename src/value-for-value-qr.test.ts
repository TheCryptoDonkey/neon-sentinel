import { describe, expect, it } from 'vitest';
import { decode, encode, isDark } from '@forgesworn/qr';
import { encodeValueForValueQr } from './value-for-value';
import fixtures from './value-for-value-qr.fixture.json';

// The fixture holds module matrices produced by the encoder this one replaced
// (qrcode-generator, level M, byte mode). The old encoder chose its mask with a
// penalty rule that differs from the QR standard's, so the two disagree on the
// mask for some payloads. With the mask pinned, data, error correction and
// placement must match it module for module.
function rowsOf(qr: ReturnType<typeof encode>): string[] {
  const rows: string[] = [];
  for (let row = 0; row < qr.size; row += 1) {
    let line = '';
    for (let col = 0; col < qr.size; col += 1) line += isDark(qr, col, row) ? '1' : '0';
    rows.push(line);
  }
  return rows;
}

function greyscale(qr: ReturnType<typeof encode>, cell = 4, margin = 4) {
  const side = (qr.size + margin * 2) * cell;
  const data = new Uint8Array(side * side).fill(255);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const col = Math.floor(x / cell) - margin;
      const row = Math.floor(y / cell) - margin;
      if (col >= 0 && row >= 0 && col < qr.size && row < qr.size && isDark(qr, col, row)) data[y * side + x] = 0;
    }
  }
  return { data, width: side, height: side };
}

describe('value-for-value QR encoder', () => {
  for (const fixture of fixtures) {
    const label = `${fixture.value.slice(0, 16)}...`;

    it(`matches the previous encoder with the same mask (${label})`, () => {
      const qr = encode(fixture.value, { ecc: 'M', mode: 'byte', mask: fixture.mask as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 });
      expect(qr.size).toBe(fixture.size);
      expect(rowsOf(qr)).toEqual(fixture.rows);
    });

    it(`encodes at level M and reads back (${label})`, () => {
      const qr = encodeValueForValueQr(fixture.value);
      expect(qr.ecc).toBe('M');
      expect(qr.size).toBe(fixture.size);
      expect(decode(greyscale(qr))?.text).toBe(fixture.value);
    });
  }
});
