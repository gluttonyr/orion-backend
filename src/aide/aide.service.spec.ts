import { BadRequestException } from '@nestjs/common';
import { requiredText } from './aide.service';

describe('requiredText', () => {
  it('trims valid text', () => {
    expect(requiredText('  Paiement  ', 'Le titre', 150)).toBe('Paiement');
  });

  it('rejects empty, non-string and too long values', () => {
    for (const value of ['', '   ', undefined, 42, 'x'.repeat(151)]) {
      expect(() => requiredText(value, 'Le titre', 150)).toThrow(BadRequestException);
    }
  });
});
